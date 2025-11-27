export interface Note {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  attachments?: Record<string, string>;
}

export interface Category {
  id: string;
  name: string;
  count: number;
}

export type MarkdownTheme = 'classic' | 'serif' | 'night' | 'pastel' | 'paper' | 'contrast' | 'mono' | 'terminal';

export interface AppSettings {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  userName?: string;
  // Custom Prompts
  customAnalyzePrompt?: string;
  customPolishPrompt?: string;
  markdownTheme?: MarkdownTheme;
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
