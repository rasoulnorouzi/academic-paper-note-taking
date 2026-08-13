import { GoogleGenAI } from '@google/genai';
import type { Schema } from '@google/genai';
import { SYSTEM_PROMPT, FIELDS, geminiResponseSchema, deepseekSchemaText } from './schema';
import type { PaperSummary, Provider } from './types';

// This module has no React and no DOM APIs: scripts/smoke.ts imports it from Node.

const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';

const BAD_KEY = 'The API key is not valid. Check the key.';
const RATE_LIMIT = 'The provider set a rate limit. Wait, then try again.';
const BAD_JSON = 'The model did not return valid JSON. Try again, or use a different model.';

export async function analyze(
  provider: Provider,
  model: string,
  apiKey: string,
  text: string,
  filename: string,
): Promise<PaperSummary> {
  const raw =
    provider === 'deepseek'
      ? await callDeepSeek(model, apiKey, text)
      : await callGemini(model, apiKey, text);

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(BAD_JSON);
  }
  return toSummary(parsed, filename);
}

async function callDeepSeek(model: string, apiKey: string, text: string): Promise<string> {
  const body = {
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT + '\n\n' + deepseekSchemaText() },
      { role: 'user', content: 'Paper text:\n\n' + text + '\n\nReturn the JSON object now.' },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 8192,
    temperature: 0.2,
  };

  const response = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const snippet = (await response.text().catch(() => '')).slice(0, 200);
    throw new Error(httpMessage(response.status, snippet));
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || content.trim() === '') {
    throw new Error(BAD_JSON);
  }
  return content;
}

async function callGemini(model: string, apiKey: string, text: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey });

  let content: string | undefined;
  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ text: 'Paper text:\n\n' + text }] }],
      config: {
        responseMimeType: 'application/json',
        responseSchema: geminiResponseSchema() as Schema,
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.1,
      },
    });
    content = response.text;
  } catch (error) {
    throw new Error(sdkMessage(error));
  }

  if (typeof content !== 'string' || content.trim() === '') {
    throw new Error(BAD_JSON);
  }
  return content;
}

function httpMessage(status: number, snippet: string): string {
  if (status === 401 || status === 403) return BAD_KEY;
  if (status === 429) return RATE_LIMIT;
  return `The provider returned an error. Status ${status}. ${snippet}`;
}

// The Gemini SDK throws instead of returning a response, so read the status from the message.
function sdkMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('401') || message.includes('403') || message.includes('API key')) {
    return BAD_KEY;
  }
  if (message.includes('429') || message.includes('RESOURCE_EXHAUSTED')) {
    return RATE_LIMIT;
  }
  return `The provider returned an error. ${message.slice(0, 200)}`;
}

// The model can drop keys or return the wrong JSON type. Fill every key so the UI
// never reads undefined.
function toSummary(parsed: unknown, filename: string): PaperSummary {
  const source = (parsed && typeof parsed === 'object' ? parsed : {}) as Record<string, unknown>;
  const filled: Record<string, string | string[]> = {};

  for (const field of FIELDS) {
    const value = source[field.key];
    if (field.kind === 'list') {
      filled[field.key] = Array.isArray(value) ? value.map((item) => String(item)) : [];
    } else {
      filled[field.key] = typeof value === 'string' ? value : '';
    }
  }
  filled.sourceFilename = filename;

  // Safe: the loop above writes every PaperSummary key with the right type.
  return filled as unknown as PaperSummary;
}
