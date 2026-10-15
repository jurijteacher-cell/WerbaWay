import { existsSync, readFileSync, readdirSync } from 'fs';
import path from 'path';

const ROOT = process.cwd();

const SEARCH_DIRS = [
  path.join(ROOT, 'content-queue/lectures/pending'),
  path.join(ROOT, 'content-queue/lectures/published'),
  path.join(ROOT, 'content-queue/lectures/incoming'),
];

export type ImageLockSlot = {
  status: 'ok' | 'missing';
  photo_id?: string;
  url?: string;
  author?: string;
  author_url?: string;
  download_location?: string;
  credit?: string;
};

export type QueueLessonBundle = {
  lessonId: string;
  dir: string;
  markdown: string;
  frontmatter: Record<string, string>;
  body: string;
  vocab?: unknown;
  pictures?: unknown;
  commTasks?: unknown;
  grammar?: unknown;
  exam?: unknown;
  hw?: unknown;
  slides?: unknown;
  images: Record<string, ImageLockSlot>;
};

function parseFrontmatter(raw: string): { frontmatter: Record<string, string>; body: string } {
  if (!raw.startsWith('---')) return { frontmatter: {}, body: raw };
  const end = raw.indexOf('\n---', 3);
  if (end < 0) return { frontmatter: {}, body: raw };
  const fmBlock = raw.slice(3, end).trim();
  const body = raw.slice(end + 4).replace(/^\n/, '');
  const frontmatter: Record<string, string> = {};
  for (const line of fmBlock.split('\n')) {
    const m = line.match(/^([a-zA-Z0-9_]+):\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    frontmatter[m[1]] = v;
  }
  return { frontmatter, body };
}

function findLessonDir(lessonId: string): string | null {
  for (const base of SEARCH_DIRS) {
    if (!existsSync(base)) continue;
    const nested = path.join(base, lessonId);
    if (existsSync(path.join(nested, `${lessonId}.md`))) return nested;
    const flat = path.join(base, `${lessonId}.md`);
    if (existsSync(flat)) return base;
  }
  return null;
}

function readJson(dir: string, name: string): unknown | undefined {
  const p = path.join(dir, name);
  if (!existsSync(p)) return undefined;
  return JSON.parse(readFileSync(p, 'utf8'));
}

export function hasQueueLesson(lessonId: string): boolean {
  return findLessonDir(lessonId) != null;
}

export function loadQueueLesson(lessonId: string): QueueLessonBundle | null {
  const dir = findLessonDir(lessonId);
  if (!dir) return null;
  const mdPath = path.join(dir, `${lessonId}.md`);
  if (!existsSync(mdPath)) return null;
  const raw = readFileSync(mdPath, 'utf8');
  const { frontmatter, body } = parseFrontmatter(raw);

  let images: Record<string, ImageLockSlot> = {};
  const lockPath = path.join(dir, `${lessonId}-images.lock.json`);
  if (existsSync(lockPath)) {
    const rawLock = JSON.parse(readFileSync(lockPath, 'utf8')) as Record<string, unknown>;
    for (const [k, v] of Object.entries(rawLock)) {
      if (k === 'lesson_id' || typeof v !== 'object' || !v) continue;
      images[k] = v as ImageLockSlot;
    }
  }

  return {
    lessonId,
    dir,
    markdown: raw,
    frontmatter,
    body,
    vocab: readJson(dir, `${lessonId}-vocab.json`),
    pictures: readJson(dir, `${lessonId}-pictures.json`),
    commTasks: readJson(dir, `${lessonId}-comm-tasks.json`),
    grammar: readJson(dir, `${lessonId}-grammar.json`),
    exam: readJson(dir, `${lessonId}-exam.json`),
    hw: readJson(dir, `${lessonId}-hw.json`),
    slides: readJson(dir, `${lessonId}-slides.json`),
    images,
  };
}

export function listQueueLessonIds(): string[] {
  const ids = new Set<string>();
  for (const base of SEARCH_DIRS) {
    if (!existsSync(base)) continue;
    for (const name of readdirSync(base)) {
      const nested = path.join(base, name, `${name}.md`);
      if (existsSync(nested)) ids.add(name);
      if (name.endsWith('.md') && !name.includes('-teacher') && !name.startsWith('CURSOR')) {
        ids.add(name.replace(/\.md$/, ''));
      }
    }
  }
  return [...ids];
}

export { parseBlockRange, parseBlockIds } from './block-ids';
