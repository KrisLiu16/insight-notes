
import { Note, AppSettings } from '../types';

const STORAGE_KEY_NOTES = 'zhishi_notes_v1';
const STORAGE_KEY_SETTINGS = 'zhishi_settings_v1';

// Default Configurations
export const DEFAULT_BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
export const DEFAULT_MODEL = 'doubao-1-5-pro-32k-250115';
export const DEFAULT_SYSTEM_PROMPT = 'You are a helpful assistant.';
export const DEFAULT_SORT_BY = 'updatedAt';
export const DEFAULT_SORT_ORDER = 'desc';

// Default Prompts
export const DEFAULT_ANALYZE_PROMPT = `Analyze the provided markdown note content.
If the content contains "Title", "Tags", "Referenced Notes", and "Main Content" sections, prioritize analyzing the "Main Content" but use the other sections for context.
1. Generate up to 5 relevant tags (keywords).
2. Write a 1-sentence summary in Chinese.

Output JSON Format:
{
  "tags": ["tag1", "tag2"],
  "summary": "Your summary here"
}`;

export const DEFAULT_POLISH_PROMPT = `Act as a professional text editor.
The user will provide a note content which may include metadata sections like "Title", "Tags", "Referenced Notes", and "Main Content".
YOUR TASK is to ONLY edit the "Main Content" part (or the whole text if no sections are present).
- Make it more fluent, professional, and elegant, and correct any typos.
- Keep the original Markdown format (headings, code blocks, quotes, etc.) unchanged.
- IMPORTANT: DO NOT output the "Title", "Tags", "Referenced Notes" or any section separators (like "--- Main Content ---").
- ONLY return the edited Main Content itself.
- If the text starts with "？" or "?", then this line is an instruction rather than content to polish; execute this instruction.`;

export const DEFAULT_MERGE_SUMMARY_PROMPT = `你是一个技术专家。请根据提供的 Git Merge 信息和代码 Diff 生成一份工作总结。

**重要：输出请直接使用 Markdown 格式。**
- **所有内容（标题、总结、影响分析等）必须严格使用中文输出。**
- 请在文档末尾专门列出对每个文件的分析。

Markdown 输出模板：
# [Type] Title

## Context
- **Time**: {commit_date}
- **Author**: {author}
- **Email**: {email}
- **Commit**: {hash}

## Summary
{brief_summary} (请使用中文)

## Key Changes
- {point_1} (请使用中文)
- {point_2} (请使用中文)

## Impact
{impact_analysis} (请使用中文)

## Keywords
{keywords_comma_separated}

## File Reviews
### path/to/file1.go
{技术分析内容...}

### path/to/file2.ts
{技术分析内容...}

**输入数据说明：**
你将收到包含以下部分的输入：
1. [Changed Files]: 变更文件列表及状态。
2. [Statistics]: 变更行数统计。
3. [Diff Details]: 具体代码变更差异。

**分析要求：**
- 请仔细分析 [Changed Files] 和 [Diff Details] 来理解每个变更的具体意图。
- **正文（Summary, Key Changes 等）中不要包含 Diff 代码块**。
- **File Reviews 部分**：请针对每个变更文件，提供一段中文技术分析，解释该文件的具体变更内容和目的。请严格按照 \`### 文件路径\` 的格式列出，以便解析。`;


export const DEFAULT_REQUIREMENT_PROMPT = `你是一个高级技术经理。请根据提供的多个项目/服务的变更文档（Git Merge Reports）和需求上下文，生成一份综合的需求上线汇报。

**目标**：
1. 整合各个项目的变更点，形成统一的业务视角。
2. 关联需求文档与代码实现。
3. 评估整体影响面。

**输出格式**：Markdown

**模板**：
# [Requirement] {Requirement_Title}

## 1. 需求背景
{Summary of requirement context...}

## 2. 变更汇总
### 服务/项目 A
- 变更点 1...
- 变更点 2...

### 服务/项目 B
- 变更点...

## 3. 技术实现概览
{High-level technical summary...}

## 4. 影响范围与风险
- ...

## 5. 参考文档
- ...

**输入说明**：
- [Requirement Context]: 用户提供的需求文档或背景。
- [Merged Documents]: 多个项目的具体变更内容（已去除详细代码，保留路径与关键信息）。

请忽略具体的代码细节，关注业务逻辑变更和系统交互。`;

export const DEFAULT_GIT_IGNORE_PATTERNS = `go.sum
go.mod
package-lock.json
yarn.lock
pnpm-lock.yaml
Cargo.lock`;

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
            userName: 'Insight Explorer',
            customAnalyzePrompt: DEFAULT_ANALYZE_PROMPT,
            customPolishPrompt: DEFAULT_POLISH_PROMPT,
            customMergePrompt: DEFAULT_MERGE_SUMMARY_PROMPT,
            customRequirementPrompt: DEFAULT_REQUIREMENT_PROMPT,
            excludeCodeInRequirement: true,
            gitIgnorePatterns: DEFAULT_GIT_IGNORE_PATTERNS,
            markdownTheme: 'classic',
        };
    }
    const parsed = JSON.parse(data);
    const theme = parsed.markdownTheme === 'feishu' ? 'classic' : (parsed.markdownTheme === 'pastel' ? 'github' : parsed.markdownTheme);
    
    // Auto-migrate old JSON prompt to new Markdown prompt REMOVED as per user request
    // Users should manually reset if they want the new default, or keep their custom JSON prompt if they prefer.
    let currentMergePrompt = parsed.customMergePrompt || DEFAULT_MERGE_SUMMARY_PROMPT;

    // Ensure defaults exist for older saved versions or missing fields
    return {
        ...parsed,
        baseUrl: parsed.baseUrl || DEFAULT_BASE_URL,
        model: parsed.model || DEFAULT_MODEL,
        customAnalyzePrompt: parsed.customAnalyzePrompt || DEFAULT_ANALYZE_PROMPT,
        customPolishPrompt: parsed.customPolishPrompt || DEFAULT_POLISH_PROMPT,
        customMergePrompt: currentMergePrompt,
        customRequirementPrompt: parsed.customRequirementPrompt || DEFAULT_REQUIREMENT_PROMPT,
        gitIgnorePatterns: parsed.gitIgnorePatterns || DEFAULT_GIT_IGNORE_PATTERNS,
        markdownTheme: theme || 'classic',
        sortBy: parsed.sortBy || DEFAULT_SORT_BY,
        sortOrder: parsed.sortOrder || DEFAULT_SORT_ORDER,
    };
  } catch (error) {
    console.error('Failed to load settings', error);
    return { apiKey: '', baseUrl: DEFAULT_BASE_URL, model: DEFAULT_MODEL, markdownTheme: 'classic', sortBy: DEFAULT_SORT_BY, sortOrder: DEFAULT_SORT_ORDER };
  }
};

const STORAGE_KEY_ID_SEQ = 'zhishi_id_seq_v1';

export const generateId = (): string => {
  try {
    const min = 100000000;
    const max = 999999999;

    const seqStr = localStorage.getItem(STORAGE_KEY_ID_SEQ);
    let seq = seqStr ? parseInt(seqStr, 10) : NaN;

    if (!Number.isFinite(seq)) {
      // 初始化顺序 ID：从现有笔记中找到最大的 9 位数字 ID
      let initial = min - 1;
      const notesRaw = localStorage.getItem(STORAGE_KEY_NOTES);
      if (notesRaw) {
        try {
          const existing = JSON.parse(notesRaw) as Array<{ id?: string }>;
          existing.forEach(n => {
            const id = typeof n.id === 'string' ? n.id : String(n.id || '');
            if (/^\d{9,10}$/.test(id)) {
              const num = parseInt(id, 10);
              if (Number.isFinite(num)) initial = Math.max(initial, num);
            }
          });
        } catch {}
      }
      seq = initial;
    }

    let next = seq + 1;
    if (next > max) {
      // 防止溢出：回绕到最小值（极端情况下可能与旧 ID 冲突，建议导出备份后升级 ID 方案）
      next = min;
    }
    localStorage.setItem(STORAGE_KEY_ID_SEQ, String(next));
    return String(next);
  } catch {
    // 兜底：在 localStorage 不可用时退回随机 9 位 ID
    const min = 100000000;
    const max = 999999999;
    return Math.floor(min + Math.random() * (max - min)).toString();
  }
};
