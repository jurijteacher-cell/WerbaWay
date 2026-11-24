import OpenAI from 'openai';

let client: OpenAI | null = null;

/** Серверний клієнт OpenAI. Ключ — OPENAI_API_KEY або `OpenAI_key` (так змінну названо у Vercel); ніколи не NEXT_PUBLIC_. */
export function getOpenAIClient(): OpenAI | null {
  const apiKey = (process.env.OPENAI_API_KEY ?? process.env.OpenAI_key)?.trim();
  if (!apiKey) return null;
  if (!client) client = new OpenAI({ apiKey });
  return client;
}
