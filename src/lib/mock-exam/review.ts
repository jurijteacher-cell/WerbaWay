import 'server-only';
import type { MockExam, MockScore, ItemResult, TaskResult, WritingResult } from './core';
import type { WritingGrade } from './writing-grade';

/** Що лежить у `mock_results.score` (jsonb). `answers` пишеться з 25.11.2026; старіші рядки відновлюються з `tasks`. */
export type StoredScore = {
  sections?: MockScore['sections'];
  pending?: number;
  weak?: string[];
  tasks?: TaskResult[];
  writing?: WritingResult[];
  answers?: Record<string, string>;
  writing_ai?: WritingGrade[] | null;
  /** рядок відновлено зі сторінки Notion: є лише помилки */
  backfilled?: boolean;
};

const head = (s: string) => s.split(' · ')[0].trim();

/** Сирі відповіді учня з розбору по пунктах (для рядків до 25.11, де `answers` не зберігались). */
export function reconstructAnswers(exam: MockExam, stored: StoredScore): Record<string, string> {
  if (stored.answers) return stored.answers;
  const byId = new Map<string, ItemResult>();
  for (const t of stored.tasks ?? []) for (const r of t.items) byId.set(r.id, r);
  const out: Record<string, string> = {};

  for (const s of exam.sections) {
    for (const t of s.tasks) {
      for (const it of t.items ?? []) {
        const r = byId.get(it.id);
        if (!r) {
          // у відновлених з Notion рядках правильні пункти не записані — вони й були правильні
          if (stored.backfilled) out[it.id] = it.answer ?? it.model ?? it.accept?.[0] ?? '';
          continue;
        }
        if (r.status === 'empty' || !r.given) continue;
        if (t.layout === 'mc-passages' && it.kind !== 'tf') out[it.id] = r.given.match(/^([a-e])\)/)?.[1] ?? r.given;
        else if (t.layout === 'matching') out[it.id] = head(r.given);
        else out[it.id] = r.given;
      }
      for (const g of t.gaps ?? []) {
        const r = byId.get(g.id);
        if (!r) {
          if (stored.backfilled) out[g.id] = g.answer ?? g.accept?.[0] ?? '';
          continue;
        }
        if (r.status === 'empty' || !r.given) continue;
        out[g.id] = g.kind === 'bank' && t.bank ? head(r.given) : r.given;
      }
      if (t.layout === 'writing') {
        const w = stored.writing?.find((x) => x.task === t.id);
        const c = w ? t.choices?.find((x) => x.label === w.choice) : undefined;
        if (w && c) {
          out[`${t.id}:choice`] = c.id;
          for (const p of c.parts) {
            const wp = w.parts.find((x) => x.label === p.label);
            if (wp?.text) out[`${t.id}:${p.id}`] = wp.text;
          }
        }
      }
    }
  }
  return out;
}

/** Підсумок письма з оцінки AI для таблиці результатів. */
export function writingTotals(grades: WritingGrade[] | null | undefined) {
  if (!grades?.length) return null;
  const points = grades.reduce((a, g) => a + g.points, 0);
  const max = grades.reduce((a, g) => a + g.max, 0);
  return { points, max, level: grades.find((g) => g.level)?.level };
}
