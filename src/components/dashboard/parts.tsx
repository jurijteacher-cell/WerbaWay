import type { ReactNode } from 'react';
import { EMBED_LABEL, pctClass, type Summary } from '@/lib/analytics';
import { t } from '@/i18n/server';

export function Kpi({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-ink-line bg-ink-raised p-4">
      <p className="text-xs uppercase tracking-wider text-paper-muted">{label}</p>
      <p className={`mt-1 font-display text-3xl ${tone ?? 'text-paper'}`}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-paper-muted">{hint}</p> : null}
    </div>
  );
}

export function Activity({ daily }: { daily: Summary['daily'] }) {
  const max = Math.max(1, ...daily.map((d) => d.n));
  return (
    <div>
      <div className="flex h-24 items-end gap-[3px]" role="img" aria-label={t("Активність за 28 днів")}>
        {daily.map((d) => (
          <div
            key={d.date}
            title={`${d.date}: ${d.n}`}
            className={`flex-1 rounded-sm ${d.n ? 'bg-gold-fill' : 'bg-ink-line'}`}
            style={{ height: d.n ? `${Math.max(8, Math.round((d.n / max) * 100))}%` : '4px' }}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-xs text-paper-muted">
        <span>{t("28 днів тому")}</span>
        <span>{t("сьогодні")}</span>
      </div>
    </div>
  );
}

export function WeakList({ weak }: { weak: Summary['weak'] }) {
  if (!weak.length) {
    return <p className="text-sm text-paper-muted">{t("Поки замало даних: тема з’являється після 3 відповідей з першої спроби.")}</p>;
  }
  return (
    <ul className="flex flex-col gap-2">
      {weak.map((w) => (
        <li key={w.point} className="flex items-center gap-3 text-sm">
          <span className="min-w-0 flex-1 truncate text-paper">{w.point}</span>
          <span className="h-2 w-24 shrink-0 overflow-hidden rounded bg-ink-line">
            <span className="block h-full bg-gold-solid" style={{ width: `${w.pct}%` }} />
          </span>
          <span className={`w-12 shrink-0 text-right font-mono ${pctClass(w.pct)}`}>{w.pct}%</span>
          <span className="w-10 shrink-0 text-right text-xs text-paper-muted">{w.ok}/{w.total}</span>
        </li>
      ))}
    </ul>
  );
}

export function EmbedBreakdown({ byEmbed }: { byEmbed: Summary['byEmbed'] }) {
  if (!byEmbed.length) return <p className="text-sm text-paper-muted">—</p>;
  return (
    <ul className="flex flex-col gap-2 text-sm">
      {byEmbed.map((e) => (
        <li key={e.embed} className="flex items-baseline justify-between gap-3">
          <span className="text-paper">{EMBED_LABEL[e.embed] ?? e.embed}</span>
          <span className="text-paper-muted">
            {e.attempts} спроб ·{' '}
            <span className={`font-mono ${pctClass(e.pct)}`}>{e.pct == null ? '—' : `${e.pct}%`}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 font-display text-xl text-paper">{title}</h2>
      {children}
    </section>
  );
}
