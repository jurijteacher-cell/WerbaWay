export const fmt = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString('uk-UA', {
        timeZone: 'Europe/Kyiv',
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

export function pct(ok: number, total: number) {
  return total ? Math.round((ok / total) * 100) : null;
}

export function pctClass(p: number | null) {
  if (p == null) return 'text-paper-muted';
  return p >= 80 ? 'text-correct' : p >= 60 ? 'text-gold' : 'text-incorrect';
}
