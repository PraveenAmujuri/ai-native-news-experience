// server/services/aiService.js
const { GoogleGenAI } = require("@google/genai");

// The 2026 SDK uses a unified Client object
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const generateNavigatorBriefing = async (query, persona, articles) => {
    try {
        const contextText = articles.map(a => `${a.title}: ${a.content}`).join("\n\n");

        // Options: "gemini-2.5-flash" (Stable) or "gemini-3-flash-preview" (Latest)
        const modelId = "gemini-2.5-flash"; 

        const response = await ai.models.generateContent({
            model: modelId,
            contents: [{ 
                role: "user", 
                parts: [{ text: `
                    Act as the ET AI Intelligence Engine. 
                    Persona: ${persona}
                    News Context: ${contextText}
                    User Query: ${query}

                    Format: Summary, 3 Bullet points, and 1-line Hindi summary.
                `}] 
            }],
            config: {
                // 2.5/3.0 feature: Control the reasoning depth for speed
                thinkingConfig: { includeThoughts: true, thinkingLevel: 'low' },
                temperature: 0.7
            }
        });

        // In the new SDK, response.text is a direct property
        return response.text;
    } catch (error) {
        console.error("2.5 Flash Service Error:", error);
        throw error;
    }
};

module.exports = { generateNavigatorBriefing };