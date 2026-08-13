import { GoogleGenAI } from '@google/genai';
import type { Schema } from '@google/genai';
import { SYSTEM_PROMPT, FIELDS, geminiResponseSchema, deepseekSchemaText } from './schema';
import type { PaperSummary, Provider } from './types';

// This module has no React and no DOM APIs: scripts/smoke.ts imports it from Node.

const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';

const BAD_KEY = 'The API key is not valid. Check the key.';
const RATE_LIMIT = 'The provider set a rate limit. Wait, then try again.';
const BAD_JSON = 'The model did not return valid JSON. Try again, or use a different model.';
const STOPPED = 'Stopped.';

// The user can stop the batch. Both call paths must show the stop, not a provider error.
function isAbort(error: unknown): boolean {
  if (error instanceof Error && error.name === 'AbortError') {
    return true;
  }
  const message = error instanceof Error ? error.message : String(error);
  return message.toLowerCase().includes('abort');
}

export async function analyze(
  provider: Provider,
  model: string,
  apiKey: string,
  text: string,
  filename: string,
  signal?: AbortSignal,
): Promise<PaperSummary> {
  const raw =
    provider === 'deepseek'
      ? await callDeepSeek(model, apiKey, text, signal)
      : await callGemini(model, apiKey, text, signal);

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(BAD_JSON);
  }
  return toSummary(parsed, filename);
}

async function callDeepSeek(
  model: string,
  apiKey: string,
  text: string,
  signal?: AbortSignal,
): Promise<string> {
  const body = {
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT + '\n\n' + deepseekSchemaText() },
      { role: 'user', content: 'Paper text:\n\n' + text + '\n\nReturn the JSON object now.' },
    ],
    response_format: { type: 'json_object' },
    // DeepSeek V4 accepts max_tokens up to 393216; detailed notes on dense
    // papers overflow 8192 and truncate the JSON.
    max_tokens: 32768,
    temperature: 0.2,
  };

  let response: Response;
  try {
    response = await fetch(DEEPSEEK_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: signal,
    });
  } catch (error) {
    if (isAbort(error)) {
      throw new Error(STOPPED);
    }
    throw error;
  }

  if (!response.ok) {
    const snippet = (await response.text().catch(() => '')).slice(0, 200);
    throw new Error(httpMessage(response.status, snippet));
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string }; finish_reason?: string }[];
  };
  if (data.choices?.[0]?.finish_reason === 'length') {
    throw new Error('The notes did not fit in the model output limit. Try DeepSeek V4 Pro, or use a shorter paper.');
  }
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || content.trim() === '') {
    throw new Error(BAD_JSON);
  }
  return content;
}

async function callGemini(
  model: string,
  apiKey: string,
  text: string,
  signal?: AbortSignal,
): Promise<string> {
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
        abortSignal: signal,
      },
    });
    content = response.text;
  } catch (error) {
    if (isAbort(error)) {
      throw new Error(STOPPED);
    }
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
