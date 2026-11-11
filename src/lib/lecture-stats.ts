import { existsSync, readFileSync } from 'fs';
import path from 'path';
import type { AttemptRow } from '@/lib/analytics';

/**
 * Скільки завдань у лекції (з контент-файлів вправ) і як учень їх виконав.
 * Лекція = grammar + exam, домашка = hw. Комунікативні картки й слова не оцінюються автоматично.
 */

const DIR = path.join(process.cwd(), 'src/content/queue-published');
const LECTURE_EMBEDS = ['grammar', 'exam'] as const;
const HOMEWORK_EMBEDS = ['hw'] as const;

function countItems(lessonId: string, embed: string): number {
  const f = path.join(DIR, `${lessonId}-${embed}.json`);
  if (!existsSync(f)) return 0;
  try {
    const d = JSON.parse(readFileSync(f, 'utf8')) as { blocks?: { items?: unknown[] }[]; items?: unknown[] };
    if (Array.isArray(d.blocks)) return d.blocks.reduce((n, b) => n + (b.items?.length ?? 0), 0);
    return d.items?.length ?? 0;
  } catch {
    return 0;
  }
}

export type PartStats = {
  total: number;
  /** скільки завдань учень виконав (унікальні), не більше total */
  done: number;
  /** відсоток проходження, 0–100 (null — у цій частині завдань немає) */
  pct: number | null;
  /** оцінка: частка правильних з першої спроби серед перевірюваних завдань, 0–100 (null — ще нічого не оцінено) */
  grade: number | null;
  gradedOk: number;
  gradedTotal: number;
};

export type LectureStats = {
  lecture: PartStats;
  homework: PartStats;
  /** середня оцінка за всю лекцію з домашкою */
  grade: number | null;
  /** будь-яка активність у цій лекції */
  touched: boolean;
  lastAt: string | null;
};

function part(lessonId: string, embeds: readonly string[], rows: AttemptRow[]): PartStats {
  const total = embeds.reduce((n, e) => n + countItems(lessonId, e), 0);
  const mine = rows.filter((r) => r.lesson_id === lessonId && embeds.includes(r.embed));
  const seen = new Set(mine.map((r) => `${r.embed}|${r.item_id}`));
  const first = mine.filter((r) => r.attempt_no === 1 && r.is_correct != null);
  const gradedOk = first.filter((r) => r.is_correct).length;
  const done = total ? Math.min(seen.size, total) : seen.size;
  return {
    total,
    done,
    pct: total ? Math.round((done / total) * 100) : null,
    grade: first.length ? Math.round((gradedOk / first.length) * 100) : null,
    gradedOk,
    gradedTotal: first.length,
  };
}

export function lectureStats(lessonId: string, rows: AttemptRow[]): LectureStats {
  const lecture = part(lessonId, LECTURE_EMBEDS, rows);
  const homework = part(lessonId, HOMEWORK_EMBEDS, rows);
  const ok = lecture.gradedOk + homework.gradedOk;
  const all = lecture.gradedTotal + homework.gradedTotal;
  const mine = rows.filter((r) => r.lesson_id === lessonId);
  const lastAt = mine.reduce<string | null>((m, r) => (!m || r.created_at > m ? r.created_at : m), null);
  return { lecture, homework, grade: all ? Math.round((ok / all) * 100) : null, touched: mine.length > 0, lastAt };
}

export function gradeLabel(g: number | null): { text: string; tone: 'good' | 'ok' | 'weak' | 'none' } {
  if (g == null) return { text: 'ще не оцінено', tone: 'none' };
  if (g >= 85) return { text: 'Відмінно', tone: 'good' };
  if (g >= 70) return { text: 'Добре', tone: 'ok' };
  if (g >= 50) return { text: 'Можна краще', tone: 'weak' };
  return { text: 'Варто повторити', tone: 'weak' };
}
