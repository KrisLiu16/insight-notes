
import { DEFAULT_ANALYZE_PROMPT, DEFAULT_POLISH_PROMPT, DEFAULT_BASE_URL, DEFAULT_MODEL } from "./storage";

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
  jsonMode: boolean = false
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
  if (jsonMode && (model.includes('gpt') || model.includes('gemini'))) {
     body.response_format = { type: "json_object" };
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    
    // Standard OpenAI format: data.choices[0].message.content
    if (data.choices && data.choices.length > 0 && data.choices[0].message) {
      return data.choices[0].message.content;
    } else {
      console.error("Unexpected API response format", data);
      throw new Error("Invalid API response format");
    }

  } catch (error) {
    console.error("AI Request Failed", error);
    throw error;
  }
};

export const generateTagsAndSummary = async (content: string, apiKey: string, customPrompt?: string, baseUrl?: string, model?: string) => {
  const systemInstruction = customPrompt || DEFAULT_ANALYZE_PROMPT;
  const fullSystemInstruction = `${systemInstruction}\n\nIMPORTANT: Return a strict JSON object with keys "tags" (array of strings) and "summary" (string). Do not wrap in markdown code blocks.`;

  const responseText = await callChatCompletion(
    [
      { role: "system", content: fullSystemInstruction },
      { role: "user", content: content.substring(0, 15000) }
    ],
    { apiKey, baseUrl, model },
    true
  );

  try {
    const cleanedJson = cleanJsonString(responseText);
    return JSON.parse(cleanedJson);
  } catch (e) {
    console.error("Failed to parse JSON from AI", responseText);
    throw new Error("AI returned invalid JSON");
  }
};

export const polishContent = async (content: string, apiKey: string, customPrompt?: string, baseUrl?: string, model?: string): Promise<string> => {
  const systemInstruction = customPrompt || DEFAULT_POLISH_PROMPT;

  const responseText = await callChatCompletion(
    [
      { role: "system", content: systemInstruction },
      { role: "user", content: content }
    ],
    { apiKey, baseUrl, model },
    false
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
    ...history.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: prompt },
  ];
  const responseText = await callChatCompletion(messages, { apiKey, baseUrl, model }, false);
  return responseText || '';
};
