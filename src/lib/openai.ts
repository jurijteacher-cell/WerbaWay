import OpenAI from 'openai';

let client: OpenAI | null = null;

/** Серверний клієнт OpenAI. Ключ тільки в OPENAI_API_KEY — ніколи не NEXT_PUBLIC_. */
export function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;
  if (!client) client = new OpenAI({ apiKey });
  return client;
}
