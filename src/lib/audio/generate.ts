import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { joinWithGaps } from './mp3';
import { type ResolvedFile, storageKey } from './scripts';

export const AUDIO_BUCKET = 'audio';

/** Ключ шукаємо за кількома звичними назвами — і за будь-якою змінною з ELEVEN у назві. */
export function envKey(names: string[], pattern: RegExp): string | null {
  for (const n of names) {
    const v = process.env[n];
    if (v && v.trim()) return v.trim();
  }
  const k = Object.keys(process.env).find((n) => pattern.test(n) && process.env[n]?.trim());
  return k ? process.env[k]!.trim() : null;
}

export const elevenKey = () =>
  envKey(['ELEVENLABS_API_KEY', 'ELEVEN_LABS_API_KEY', 'ELEVENLABS_KEY', 'XI_API_KEY', 'Eleven_Labs'], /ELEVEN/i);

export function envNames(pattern: RegExp): string[] {
  return Object.keys(process.env).filter((n) => pattern.test(n));
}

async function tts(key: string, voiceId: string, text: string, model: string): Promise<Buffer> {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`;
  const call = (m: string) =>
    fetch(url, {
      method: 'POST',
      headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify({ text, model_id: m }),
      cache: 'no-store',
    });
  let r = await call(model);
  // модель недоступна на тарифі / в API → запасна багатомовна
  if (!r.ok && (r.status === 400 || r.status === 422) && model !== 'eleven_multilingual_v2') {
    const body = await r.text();
    if (/model/i.test(body)) r = await call('eleven_multilingual_v2');
    else throw new Error(`ElevenLabs ${r.status}: ${body.slice(0, 300)}`);
  }
  if (r.status === 429) {
    await new Promise((res) => setTimeout(res, 2500));
    r = await call(model);
  }
  if (!r.ok) throw new Error(`ElevenLabs ${r.status}: ${(await r.text()).slice(0, 300)}`);
  return Buffer.from(await r.arrayBuffer());
}

/** Не більше трьох запитів одночасно (ліміт паралельності тарифу Starter / Creator). */
async function pool<T, R>(items: T[], n: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    })
  );
  return out;
}

export function storage() {
  const admin = createAdminClient();
  if (!admin) return null;
  return admin.storage;
}

export function publicUrl(key: string): string | null {
  const st = storage();
  if (!st) return null;
  return st.from(AUDIO_BUCKET).getPublicUrl(key).data.publicUrl;
}

export async function exists(key: string): Promise<boolean> {
  const url = publicUrl(key);
  if (!url) return false;
  const r = await fetch(url, { method: 'HEAD', cache: 'no-store' });
  return r.ok;
}

async function ensureBucket() {
  const st = storage();
  if (!st) throw new Error('Supabase service role is not configured');
  const { data } = await st.getBucket(AUDIO_BUCKET);
  if (!data) {
    const { error } = await st.createBucket(AUDIO_BUCKET, { public: true });
    if (error && !/exist/i.test(error.message)) throw error;
  }
}

const inflight = new Map<string, Promise<string>>();

/** Згенерувати (якщо ще нема) і повернути публічну адресу mp3. */
export function ensureAudio(f: ResolvedFile): Promise<string> {
  const key = storageKey(f);
  const running = inflight.get(key);
  if (running) return running;
  const job = (async () => {
    if (await exists(key)) return publicUrl(key)!;
    const apiKey = elevenKey();
    if (!apiKey) throw new Error('ELEVENLABS key is not configured');
    // однакова репліка (діалог, який на іспиті звучить двічі) озвучується один раз — звучить ідентично й коштує вдвічі менше
    const uniq = [...new Map(f.clips.map((c) => [`${c.voiceId}|${c.text}`, c])).values()];
    const done = await pool(uniq, 3, (c) => tts(apiKey, c.voiceId, c.text, f.model));
    const byKey = new Map(uniq.map((c, i) => [`${c.voiceId}|${c.text}`, done[i]]));
    const clips = f.clips.map((c) => byKey.get(`${c.voiceId}|${c.text}`)!);
    const { mp3 } = joinWithGaps(
      clips,
      f.clips.slice(1).map((c) => c.gapBefore)
    );
    await ensureBucket();
    const { error } = await storage()!
      .from(AUDIO_BUCKET)
      .upload(key, mp3, { contentType: 'audio/mpeg', upsert: true, cacheControl: '31536000' });
    if (error) throw error;
    return publicUrl(key)!;
  })().finally(() => inflight.delete(key));
  inflight.set(key, job);
  return job;
}
