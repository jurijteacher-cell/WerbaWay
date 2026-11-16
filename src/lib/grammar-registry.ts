import registry from '../../docs/grammar-registry.json';

export type GrammarPoint = { level: string | null; pl: string; uk: string };

const POINTS = registry.points as Record<string, GrammarPoint>;
const ALIASES = registry.aliases as Record<string, string>;
const SERVICE = new Set(registry.service as string[]);

export const LEVELS = ['A0', 'A1', 'A2', 'B1', 'B2'] as const;
export type Level = (typeof LEVELS)[number];

/** Сирий тег із вправи → канонічний тег реєстру. Невідомий тег повертається як є. */
export function canonPoint(raw: string | null | undefined): string | null {
  if (!raw) return null;
  return ALIASES[raw] ?? raw;
}

/** Службові теги (slownictwo, kalki-uk, czytanie…) не входять у прогрес за темами. */
export function isServicePoint(id: string | null | undefined): boolean {
  return !!id && SERVICE.has(id);
}

export function pointInfo(id: string | null | undefined): GrammarPoint | null {
  return id ? POINTS[id] ?? null : null;
}

export function pointLevel(id: string | null | undefined): string | null {
  return pointInfo(id)?.level ?? null;
}

/** Польська назва теми; якщо тег не в реєстрі — сам тег. */
export function pointLabel(id: string | null | undefined): string {
  return pointInfo(id)?.pl ?? id ?? '—';
}

/** Українське пояснення теми — як підпис під польською назвою. */
export function pointHint(id: string | null | undefined): string | null {
  return pointInfo(id)?.uk ?? null;
}

export function levelRank(level: string | null): number {
  const i = (LEVELS as readonly string[]).indexOf(level ?? '');
  return i === -1 ? LEVELS.length : i;
}

/** Правило mastery — те саме, що у в'юсі v_tag_mastery в Supabase. */
export const MASTERY_ACCURACY = 80;
export const MASTERY_MIN_LESSONS = 2;

export function isMastered(pct: number | null, lessons: number): boolean {
  return pct != null && pct >= MASTERY_ACCURACY && lessons >= MASTERY_MIN_LESSONS;
}
