export type UserProfile = 'investor' | 'founder' | 'student';

export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  content?: string;
  category: string;
  timestamp: string;
  sourceUrl: string;
  relevanceScore?: number;
}

export interface Briefing {
  title: string;
  synthesis: string;
  keyTakeaways: string[];
  timeline: { date: string; event: string }[];
  sentiment: 'bullish' | 'bearish' | 'neutral';
}

export interface StoryArc {
  title: string;
  milestones: { date: string; event: string; impact: string }[];
  players: { name: string; role: string }[];
  predictions: string[];
}

export interface VideoSummary {
  videoUrl: string;
  prompt: string;
  script?: string;
}

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}
