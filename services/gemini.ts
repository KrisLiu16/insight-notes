
import { DEFAULT_ANALYZE_PROMPT, DEFAULT_POLISH_PROMPT, DEFAULT_MERGE_SUMMARY_PROMPT, DEFAULT_BASE_URL, DEFAULT_MODEL, DEFAULT_SYSTEM_PROMPT } from "./storage";

interface AISettings {
  apiKey: string;
  baseUrl?: string;
  model?: string;
}

// Helper to clean JSON string from markdown code blocks
const cleanJsonString = (str: string): string => {
  return str.replace(/```json/g, '').replace(/```/g, '').trim();
};

// Generic OpenAI-compatible chat completion request
const callChatCompletion = async (
  messages: { role: string; content: string }[],
  settings: AISettings,
  jsonMode: boolean = false,
  signal?: AbortSignal,
  responseFormat?: { type: string }
) => {
  const apiKey = settings.apiKey || process.env.API_KEY || '';
  // Normalize Base URL: Remove trailing slash if present, ensure it doesn't already have /chat/completions
  let baseUrl = settings.baseUrl || DEFAULT_BASE_URL;
  if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
  
  // If user entered a root URL like https://api.openai.com/v1, append /chat/completions
  // If they entered the full path, use it. A simple heuristic is checking if it ends in 'completions'
  const endpoint = baseUrl.endsWith('completions') ? baseUrl : `${baseUrl}/chat/completions`;

  const model = settings.model || DEFAULT_MODEL;

  if (!apiKey && !baseUrl.includes('localhost')) {
    throw new Error("API_KEY_MISSING");
  }

  const body: any = {
    model: model,
    messages: messages,
    temperature: 0.7,
  };

  // Note: Not all providers support response_format: { type: "json_object" }
  // We will rely on prompt engineering for JSON, but pass it if we think it might help (e.g. OpenAI/Gemini)
  if (jsonMode && (model.includes('gpt') || model.includes('gemini') || model.includes('doubao') || model.includes('deepseek'))) {
     body.response_format = responseFormat || { type: "json_object" };
  }

  const makeRequest = async (currentBody: any) => {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(currentBody),
      signal
    });

    if (!response.ok) {
      let errorMsg = `API Error ${response.status}`;
      try {
        const errJson = await response.json();
        if (errJson && errJson.error && errJson.error.message) {
          errorMsg = `${errJson.error.code || 'Error'}: ${errJson.error.message}`;
        }
      } catch {
        const errorText = await response.text();
        if (errorText) errorMsg += `: ${errorText}`;
      }
      throw new Error(errorMsg);
    }

    const data = await response.json();
    
    // Standard OpenAI format: data.choices[0].message.content
    if (data.choices && data.choices.length > 0 && data.choices[0].message) {
      return data.choices[0].message.content;
    } else {
      console.error("Unexpected API response format", data);
      throw new Error("Invalid API response format");
    }
  };

  try {
    return await makeRequest(body);
  } catch (error: any) {
    // Fallback logic: If request failed and response_format was used, try again without it
    if (body.response_format && error.message && (
      error.message.includes('400') || 
      error.message.includes('response_format') || 
      error.message.includes('not supported')
    )) {
      console.warn('API call failed with response_format, retrying without it...');
      delete body.response_format;
      return await makeRequest(body);
    }

    if (error.name === 'AbortError') {
      throw new Error('操作已取消');
    }
    console.error("AI Request Failed", error);
    throw error;
  }
};

export const generateTagsAndSummary = async (content: string, apiKey: string, customPrompt?: string, baseUrl?: string, model?: string, signal?: AbortSignal) => {
  const systemInstruction = customPrompt || DEFAULT_ANALYZE_PROMPT;
  // Use user's prompt directly, no forced JSON injection
  const fullSystemInstruction = systemInstruction;

  const responseText = await callChatCompletion(
    [
      { role: "system", content: fullSystemInstruction },
      { role: "user", content: content.substring(0, 15000) }
    ],
    { apiKey, baseUrl, model },
    false, // Disable JSON mode
    signal
  );

  // Try parsing JSON first
  try {
    const clean = cleanJsonString(responseText);
    const data = JSON.parse(clean);
    if (data && (Array.isArray(data.tags) || typeof data.summary === 'string')) {
        return { 
            tags: Array.isArray(data.tags) ? data.tags : [], 
            summary: data.summary || '' 
        };
    }
  } catch (e) {
    // Not JSON, continue to regex fallback
  }

  // Parse text response
  const tagsMatch = responseText.match(/Tags:\s*(.*)/i);
  const summaryMatch = responseText.match(/Summary:\s*(.*)/is);

  let tags: string[] = [];
  if (tagsMatch) {
    tags = tagsMatch[1].split(/[,，]/).map(t => t.trim()).filter(Boolean);
  }

  let summary = responseText;
  if (summaryMatch) {
    summary = summaryMatch[1].trim();
  } else {
     // Fallback: If no "Summary:" prefix, use the whole text (minus tags if present)
     summary = responseText.replace(/Tags:.*\n?/i, '').trim();
  }

  return { tags, summary };
};

export const polishContent = async (content: string, apiKey: string, customPrompt?: string, baseUrl?: string, model?: string, signal?: AbortSignal): Promise<string> => {
  const systemInstruction = customPrompt || DEFAULT_POLISH_PROMPT;

  const responseText = await callChatCompletion(
    [
      { role: "system", content: systemInstruction },
      { role: "user", content: content }
    ],
    { apiKey, baseUrl, model },
    false,
    signal
  );

  return responseText || content;
};

export const chatWithAI = async (
  prompt: string,
  history: { role: 'user' | 'assistant'; content: string }[],
  apiKey: string,
  baseUrl?: string,
  model?: string
): Promise<string> => {
  const messages = [
    { role: 'system', content: DEFAULT_SYSTEM_PROMPT },
    ...history.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: prompt },
  ];
  const responseText = await callChatCompletion(messages, { apiKey, baseUrl, model }, false);
  return responseText || '';
};

export const generateGitSummary = async (diff: string, context: string, apiKey: string, baseUrl?: string, model?: string): Promise<string> => {
  const systemInstruction = `你是一个技术专家，负责根据 Git Diff 生成工作汇报。
请总结提供的代码变更（Diff）。
关注功能性变更和业务影响。
使用 Markdown 列表格式。
语言：简体中文。
额外上下文：${context}`;

  // Diff can be huge, truncate if needed. 20k chars is a safe bet for most models.
  const truncatedDiff = diff.substring(0, 20000); 

  const responseText = await callChatCompletion(
    [
      { role: "system", content: systemInstruction },
      { role: "user", content: `Diff:\n${truncatedDiff}` }
    ],
    { apiKey, baseUrl, model },
    false
  );

  return responseText || '生成总结失败';
};

export const generateMergeSummary = async (
  diff: string, 
  commitInfo: string, 
  apiKey: string, 
  customPrompt?: string, 
  baseUrl?: string, 
  model?: string,
  signal?: AbortSignal
) => {
  const systemInstruction = customPrompt || DEFAULT_MERGE_SUMMARY_PROMPT;
  // Use user's prompt directly, no forced JSON injection
  const fullSystemInstruction = systemInstruction;

  // Diff truncation to avoid token limits (e.g. 50k chars)
  const truncatedDiff = diff.substring(0, 50000);
  const userContent = `Commit Info:\n${commitInfo}\n\nDiff:\n${truncatedDiff}`;

  const responseText = await callChatCompletion(
    [
      { role: "system", content: fullSystemInstruction },
      { role: "user", content: userContent }
    ],
    { apiKey, baseUrl, model },
    false, // Disable JSON mode
    signal
  );

  // Return raw text response directly wrapped in an object structure for compatibility
  return {
      content: responseText
  };
};
