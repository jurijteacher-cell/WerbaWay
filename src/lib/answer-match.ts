/** Normalize student answers for tolerant grammar checks. */
export function normalizeAnswer(s: string, keepCase = false) {
  const t = s.trim().replace(/\s+/g, ' ');
  return (keepCase ? t : t.toLowerCase())
    // trailing sentence punctuation should not fail a correct form
    .replace(/[.!?…]+$/u, '')
    // occasional curly quotes / dashes
    .replace(/[„”«»"']/g, '')
    .replace(/[–—]/g, '-')
    .trim();
}

export function stripDiacritics(s: string) {
  return normalizeAnswer(s)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ł/g, 'l')
    .replace(/ø/g, 'o');
}

export type ItemState = 'idle' | 'correct' | 'wrong' | 'correct-no-diacritics';

export function answersMatch(
  given: string,
  expected: string,
  accept?: string[],
  diacritics: 'strict' | 'lenient' = 'lenient',
  letterCase: 'strict' | 'lenient' = 'lenient'
) {
  const g = normalizeAnswer(given);
  const all = [expected, ...(accept ?? [])];
  const pool = all.map((a) => normalizeAnswer(a));
  if (!g) return { ok: false as const, hint: null, state: 'wrong' as ItemState };
  if (pool.includes(g)) {
    // capital-letter exercises (Polak / polak): same letters, wrong case = wrong answer
    if (letterCase === 'strict' && !all.some((a) => normalizeAnswer(a, true) === normalizeAnswer(given, true))) {
      return { ok: false as const, hint: 'Sprawdź wielkie i małe litery.', state: 'wrong' as ItemState };
    }
    return { ok: true as const, hint: null, state: 'correct' as ItemState };
  }
  if (pool.some((a) => stripDiacritics(a) === stripDiacritics(g))) {
    if (diacritics === 'strict') {
      return { ok: false as const, hint: null, state: 'wrong' as ItemState };
    }
    const withMarks = [expected, ...(accept ?? [])].find(
      (a) => stripDiacritics(a) === stripDiacritics(g)
    );
    return {
      ok: true as const,
      hint: withMarks ? `↳ z ogonkami: ${withMarks}` : null,
      state: 'correct-no-diacritics' as ItemState,
    };
  }
  return { ok: false as const, hint: null, state: 'wrong' as ItemState };
}
