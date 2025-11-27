
import { Note, AppSettings } from '../types';

const STORAGE_KEY_NOTES = 'zhishi_notes_v1';
const STORAGE_KEY_SETTINGS = 'zhishi_settings_v1';

// Default Configurations
export const DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/';
export const DEFAULT_MODEL = 'gemini-2.0-flash';

// Default Prompts
export const DEFAULT_ANALYZE_PROMPT = `Analyze the provided markdown note content.
1. Generate up to 5 relevant tags (keywords).
2. Write a 1-sentence summary in Chinese.
Return ONLY JSON.`;

export const DEFAULT_POLISH_PROMPT = `请担任专业的文字编辑。润色以下内容，使其更加通顺、专业、优美，并纠正错别字。
保持原有的 Markdown 格式（标题、代码块、引用等）不变。
只返回润色后的正文内容，不要包含“好的”、“这是润色后的内容”等任何对话语句。`;

// Notes Persistence
export const saveNotes = (notes: Note[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY_NOTES, JSON.stringify(notes));
  } catch (error) {
    console.error('Failed to save notes to localStorage', error);
  }
};

export const loadNotes = (): Note[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY_NOTES);
    if (!data) return [];
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to load notes from localStorage', error);
    return [];
  }
};

// Settings Persistence
export const saveSettings = (settings: AppSettings): void => {
  try {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save settings', error);
  }
};

export const loadSettings = (): AppSettings => {
  try {
    const data = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (!data) {
        return {
            apiKey: '',
            baseUrl: DEFAULT_BASE_URL,
            model: DEFAULT_MODEL,
            userName: '知识探索者',
            customAnalyzePrompt: DEFAULT_ANALYZE_PROMPT,
            customPolishPrompt: DEFAULT_POLISH_PROMPT,
            markdownTheme: 'feishu',
        };
    }
    const parsed = JSON.parse(data);
    // Ensure defaults exist for older saved versions or missing fields
    return {
        ...parsed,
        baseUrl: parsed.baseUrl || DEFAULT_BASE_URL,
        model: parsed.model || DEFAULT_MODEL,
        customAnalyzePrompt: parsed.customAnalyzePrompt || DEFAULT_ANALYZE_PROMPT,
        customPolishPrompt: parsed.customPolishPrompt || DEFAULT_POLISH_PROMPT,
        markdownTheme: parsed.markdownTheme || 'feishu',
    };
  } catch (error) {
    console.error('Failed to load settings', error);
    return { apiKey: '', baseUrl: DEFAULT_BASE_URL, model: DEFAULT_MODEL, markdownTheme: 'feishu' };
  }
};

export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};
