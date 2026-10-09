/** Normalize student answers for tolerant grammar checks. */
export function normalizeAnswer(s: string) {
  return s
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
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

export function answersMatch(given: string, expected: string, accept?: string[]) {
  const g = normalizeAnswer(given);
  const pool = [expected, ...(accept ?? [])].map(normalizeAnswer);
  if (!g) return { ok: false as const, hint: null };
  if (pool.includes(g)) return { ok: true as const, hint: null };
  if (pool.some((a) => stripDiacritics(a) === stripDiacritics(g))) {
    const withMarks = [expected, ...(accept ?? [])].find(
      (a) => stripDiacritics(a) === stripDiacritics(g)
    );
    return { ok: true as const, hint: withMarks ? `↳ z ogonkami: ${withMarks}` : null };
  }
  return { ok: false as const, hint: null };
}
