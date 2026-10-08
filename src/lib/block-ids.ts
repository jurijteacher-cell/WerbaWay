/** Expand `blocks` query: `e1`, `g1,g2`, or ranges `g1-g4`. */
export function parseBlockIds(raw?: string | string[]): string[] | undefined {
  if (raw == null) return undefined;
  const parts = (Array.isArray(raw) ? raw.join(',') : raw)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (!parts.length) return undefined;

  const out: string[] = [];
  for (const p of parts) {
    const m = p.match(/^([a-zA-Z]+)(\d+)-([a-zA-Z]*)(\d+)$/);
    if (m) {
      const [, pfx, a, pfx2, b] = m;
      if (pfx2 && pfx2 !== pfx) {
        out.push(p);
        continue;
      }
      const start = Number(a);
      const end = Number(b);
      if (start <= end) {
        for (let i = start; i <= end; i++) out.push(`${pfx}${i}`);
      } else {
        for (let i = start; i >= end; i--) out.push(`${pfx}${i}`);
      }
    } else {
      out.push(p);
    }
  }
  return out;
}
