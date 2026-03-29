import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { UserProfile, NewsArticle, Briefing, StoryArc, VideoSummary } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY || "" });

export const geminiService = {
  async getPersonalizedNews(profile: UserProfile): Promise<NewsArticle[]> {
    const ai = getAI();
    const prompt = `Search for the latest business news from The Economic Times (ET) and other major Indian business sources. 
    Format the results as a JSON array of news articles tailored for a ${profile} persona.
    For an 'investor', focus on mutual funds, stock market, and macroeconomics.
    For a 'founder', focus on startup funding, competitor moves, and policy changes.
    For a 'student', focus on explainers, career trends, and fundamental concepts.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              title: { type: Type.STRING },
              summary: { type: Type.STRING },
              category: { type: Type.STRING },
              timestamp: { type: Type.STRING },
              sourceUrl: { type: Type.STRING },
              relevanceScore: { type: Type.NUMBER }
            },
            required: ["id", "title", "summary", "category", "timestamp", "sourceUrl"]
          }
        }
      }
    });

    try {
      return JSON.parse(response.text || "[]");
    } catch (e) {
      console.error("Failed to parse news", e);
      return [];
    }
  },

  async getDeepBriefing(topic: string): Promise<Briefing> {
    const ai = getAI();
    const prompt = `Synthesize all recent coverage about "${topic}" from The Economic Times and major business news sources into a single interactive intelligence briefing.
    Include a synthesis, key takeaways, a timeline of events, and overall market sentiment.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            synthesis: { type: Type.STRING },
            keyTakeaways: { type: Type.ARRAY, items: { type: Type.STRING } },
            timeline: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  date: { type: Type.STRING },
                  event: { type: Type.STRING }
                }
              }
            },
            sentiment: { type: Type.STRING, enum: ["bullish", "bearish", "neutral"] }
          },
          required: ["title", "synthesis", "keyTakeaways", "timeline", "sentiment"]
        }
      }
    });

    return JSON.parse(response.text || "{}");
  },

  async translateNews(text: string, targetLang: string): Promise<string> {
    const ai = getAI();
    const prompt = `Translate and culturally adapt the following business news text into ${targetLang}. 
    Don't just do a literal translation; explain complex business terms with local context suitable for an Indian audience.
    
    Text: ${text}`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt
    });

    return response.text || text;
  },

  async generateVideoSummary(article: NewsArticle): Promise<VideoSummary> {
    const ai = getAI();
    
    // 1. Generate Narration Script
    const scriptPrompt = `Generate a 60-90 second professional news anchor narration script for the following article: "${article.title}". 
    The script should be authoritative, informative, and include cues for data visuals and contextual overlays.
    Article Summary: ${article.summary}`;
    
    const scriptResponse = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: scriptPrompt
    });
    const script = scriptResponse.text || "";

    // 2. Generate Video with Veo
    const videoPrompt = `A professional broadcast-quality business news summary video. 
    Narration Script: ${script}
    Visual Style: Include animated data visuals, contextual overlays, and a news anchor style presentation. 
    The tone should be authoritative and informative. 
    The video should be between 60-120 seconds in narrative depth.`;

    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: videoPrompt,
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '16:9'
      }
    });

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) throw new Error("Video generation failed - no download link");

    // Fetch the video with the API key in the header
    const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY || "";
    const videoResponse = await fetch(downloadLink, {
      method: 'GET',
      headers: {
        'x-goog-api-key': apiKey,
      },
    });

    if (!videoResponse.ok) throw new Error("Failed to fetch generated video");
    
    const blob = await videoResponse.blob();
    const videoUrl = URL.createObjectURL(blob);
    
    return { videoUrl, prompt: videoPrompt, script };
  },

  async getStoryArc(topic: string): Promise<StoryArc> {
    const ai = getAI();
    const prompt = `Build a complete visual narrative for the ongoing business story: "${topic}".
    Include an interactive timeline of milestones, key players mapped with their roles, impact analysis, and "what to watch next" predictions.
    Use real-time data from Google Search to ensure accuracy as of ${new Date().toISOString()}.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            milestones: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  date: { type: Type.STRING },
                  event: { type: Type.STRING },
                  impact: { type: Type.STRING }
                }
              }
            },
            players: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  role: { type: Type.STRING }
                }
              }
            },
            predictions: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["title", "milestones", "players", "predictions"]
        }
      }
    });

    return JSON.parse(response.text || "{}");
  },

  async generatePulseUpdates(): Promise<{ text: string, type: 'market' | 'breaking' | 'policy' }[]> {
    const ai = getAI();
    const prompt = `Generate 5 real-time business news pulse updates for the Indian market. 
    Each update should be a short, punchy sentence.
    Categorize them into 'market', 'breaking', or 'policy'.
    Format as a JSON array of objects.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING },
              type: { type: Type.STRING, enum: ["market", "breaking", "policy"] }
            },
            required: ["text", "type"]
          }
        }
      }
    });

    try {
      return JSON.parse(response.text || "[]");
    } catch (e) {
      console.error("Failed to parse pulse updates", e);
      return [];
    }
  }
};
