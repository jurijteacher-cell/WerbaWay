/**
 * Категорії сторінки «Курс» (/learn): спершу рівні A0 → B2 (етапи фенікса), далі спеціальні задачі.
 * Курс (module) потрапляє в категорію за MODULE_CATEGORY; новий модуль без запису —
 * за найчастішим `level:` його лекцій. Рішення Юри 27.11.2026, docs/DESIGN_SYSTEM.md § «Категорії курсу».
 */
export type CategoryId = 'a0' | 'a1' | 'a2' | 'b1' | 'b2' | 'exam' | 'work' | 'life';

export type CategoryDef = {
  id: CategoryId;
  /** коротка мітка на плитці: «A0», «Іспити» */
  label: string;
  /** підпис під міткою */
  hint: string;
  /** картинка з public/brand/levels */
  img: string;
  kind: 'level' | 'special';
};

export const CATEGORIES: CategoryDef[] = [
  { id: 'a0', label: 'A0', hint: 'З нуля', img: '/brand/levels/a0.webp', kind: 'level' },
  { id: 'a1', label: 'A1', hint: 'Перші кроки', img: '/brand/levels/a1.webp', kind: 'level' },
  { id: 'a2', label: 'A2', hint: 'Розправляю крила', img: '/brand/levels/a2.webp', kind: 'level' },
  { id: 'b1', label: 'B1', hint: 'Впевнено', img: '/brand/levels/b1.webp', kind: 'level' },
  { id: 'b2', label: 'B2', hint: 'Вільно', img: '/brand/levels/b2.webp', kind: 'level' },
  { id: 'exam', label: 'Іспити', hint: 'telc · державний B1', img: '/brand/levels/exam.webp', kind: 'special' },
  { id: 'work', label: 'Робота', hint: 'Польська для професії', img: '/brand/levels/work.webp', kind: 'special' },
  { id: 'life', label: 'Життя', hint: 'Побут і документи', img: '/brand/levels/life.webp', kind: 'special' },
];

/** Курс → категорія. Новий модуль — додай сюди (інакше піде за рівнем лекцій). */
const MODULE_CATEGORY: Record<string, CategoryId> = {
  'pl-a1': 'a0', 'pl-a0-en': 'a0', 'ru-a0': 'a0',
  'pl-a1-en': 'a1', 'pl-kpk1': 'a1',
  'pl-a2': 'a2',
  'pl-b1-group': 'b1', 'pl-gram-ru': 'b1', 'pl-bledy': 'b1',
  'pl-gram-b2': 'b2',
  'pl-telc-b1': 'exam', 'pl-telc-probny': 'exam', 'pl-b1-cert': 'exam',
  'pl-ksieg': 'work', 'pl-nier': 'work', 'pl-trener': 'work', 'pl-remont': 'work', 'pl-arch': 'work', 'pl-b1-auto': 'work',
  'pl-preg': 'life', 'pl-prawko': 'life', 'pl-kp': 'life',
};

const LEVEL_CATEGORY: Record<string, CategoryId> = { A0: 'a0', A1: 'a1', A2: 'a2', B1: 'b1', B2: 'b2', C1: 'b2' };

export function categoryOf(code: string, levels: (string | undefined)[]): CategoryId {
  const fixed = MODULE_CATEGORY[code];
  if (fixed) return fixed;
  const count = new Map<string, number>();
  for (const l of levels) {
    const k = (l ?? '').toUpperCase().slice(0, 2);
    if (LEVEL_CATEGORY[k]) count.set(k, (count.get(k) ?? 0) + 1);
  }
  const top = [...count.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  return top ? LEVEL_CATEGORY[top] : 'life';
}
