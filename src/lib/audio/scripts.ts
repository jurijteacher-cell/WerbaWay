import 'server-only';
import { createHash } from 'crypto';
import { existsSync, readdirSync, readFileSync } from 'fs';
import path from 'path';

/**
 * Сценарії озвучення лежать у src/content/audio/<lesson_id>.json (docs/AUDIO_SITE.md).
 * Кожен файл описує mp3, які сайт сам генерує в ElevenLabs при першому запиті
 * /audio/<file>.mp3 (якщо такого файлу немає в public/audio/).
 */

export type AudioLine = {
  /** Ім'я персонажа з `voices` (або прямо voice_id). */
  who: string;
  /** Текст, як у транскрипті на TEACHER. */
  text: string;
  /** Текст для TTS, якщо відрізняється (числа словами, скорочення фонетично, теги [slowly]). */
  say?: string;
  /** Пауза перед реплікою, с (інакше — `gap` файлу). */
  gap?: number;
};

export type AudioFileSpec = {
  /** Пауза між репліками, с. Типово 0,45. */
  gap?: number;
  model?: string;
  lines: AudioLine[];
};

export type AudioScript = {
  lesson_id: string;
  model?: string;
  voices: Record<string, string>;
  files: Record<string, AudioFileSpec>;
};

export type ResolvedClip = { voiceId: string; text: string; gapBefore: number };
export type ResolvedFile = {
  name: string;
  lessonId: string;
  model: string;
  clips: ResolvedClip[];
  chars: number;
  hash: string;
};

export const DEFAULT_MODEL = 'eleven_v3';
const DEFAULT_GAP = 0.45;
export const MAX_CHARS_PER_FILE = 8000;

const ROOT = path.join(process.cwd(), 'src/content/audio');

export function loadScripts(): AudioScript[] {
  if (!existsSync(ROOT)) return [];
  return readdirSync(ROOT)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(path.join(ROOT, f), 'utf8')) as AudioScript);
}

export function resolveFile(script: AudioScript, name: string): ResolvedFile {
  const spec = script.files[name];
  const model = spec.model ?? script.model ?? DEFAULT_MODEL;
  const clips = spec.lines.map((l, i) => {
    const voiceId = script.voices[l.who] ?? l.who;
    if (!/^[A-Za-z0-9]{16,32}$/.test(voiceId)) throw new Error(`${name}: no voice for "${l.who}"`);
    return { voiceId, text: (l.say ?? l.text).trim(), gapBefore: i === 0 ? 0 : (l.gap ?? spec.gap ?? DEFAULT_GAP) };
  });
  const chars = clips.reduce((s, c) => s + c.text.length, 0);
  const hash = createHash('sha1')
    .update(JSON.stringify({ model, clips }))
    .digest('hex')
    .slice(0, 10);
  return { name, lessonId: script.lesson_id, model, clips, chars, hash };
}

export function findFile(name: string): ResolvedFile | null {
  for (const s of loadScripts()) {
    if (s.files?.[name]) return resolveFile(s, name);
  }
  return null;
}

/** Ключ у бакеті: зміна тексту чи голосу → новий хеш → новий файл (старий не віддається). */
export function storageKey(f: ResolvedFile): string {
  return `tts/${f.name.replace(/\.mp3$/, '')}-${f.hash}.mp3`;
}
