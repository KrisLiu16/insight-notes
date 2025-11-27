
export interface Note {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface Category {
  id: string;
  name: string;
  count: number;
}

export interface AppSettings {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  userName?: string;
  // Custom Prompts
  customAnalyzePrompt?: string;
  customPolishPrompt?: string;
  markdownTheme?: 'classic' | 'serif' | 'night' | 'pastel' | 'paper' | 'contrast';
}

export type ViewMode = 'list' | 'edit' | 'split' | 'view';

export interface NoteStats {
  words: number;
  chars: number;
  readingTime: number;
}

// Add Mermaid to window type for TS
declare global {
  interface Window {
    mermaid: any;
  }
}
