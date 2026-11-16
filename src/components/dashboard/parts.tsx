import type { ReactNode } from 'react';
import { EMBED_LABEL, pctClass, type Summary, type Topic } from '@/lib/analytics';
import { MASTERY_ACCURACY, MASTERY_MIN_LESSONS, pointHint, pointLabel } from '@/lib/grammar-registry';
import { t } from '@/i18n/server';

export function Kpi({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-ink-line bg-ink-raised p-4">
      <p className="ww-label">{label}</p>
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

function TopicRow({ tp }: { tp: Topic }) {
  const hint = pointHint(tp.point);
  return (
    <li className="flex items-center gap-3 text-sm">
      <span className="min-w-0 flex-1">
        <span className="block truncate text-paper">
          {tp.level ? <span className="mr-2 rounded bg-ink-line px-1.5 py-0.5 text-[10px] font-mono text-paper-muted">{tp.level}</span> : null}
          {pointLabel(tp.point)}
          {tp.mastered ? <span className="ml-2 text-correct" aria-hidden>✓</span> : null}
        </span>
        {hint ? <span className="block truncate text-xs text-paper-muted">{hint}</span> : null}
      </span>
      <span className="h-2 w-24 shrink-0 overflow-hidden rounded bg-ink-line">
        <span className={`block h-full ${tp.mastered ? 'bg-correct' : 'bg-gold-solid'}`} style={{ width: `${tp.pct}%` }} />
      </span>
      <span className={`w-12 shrink-0 text-right font-mono ${pctClass(tp.pct)}`}>{tp.pct}%</span>
      <span className="w-14 shrink-0 text-right text-xs text-paper-muted" title={t("Правильних з першої спроби / усього · у скількох уроках")}>
        {tp.ok}/{tp.total} · {tp.lessons}
      </span>
    </li>
  );
}

export function WeakList({ weak }: { weak: Summary['weak'] }) {
  if (!weak.length) {
    return <p className="text-sm text-paper-muted">{t("Поки замало даних: тема з’являється після 3 відповідей з першої спроби.")}</p>;
  }
  return (
    <ul className="flex flex-col gap-2">
      {weak.map((w) => (
        <TopicRow key={w.point} tp={w} />
      ))}
    </ul>
  );
}

/** Прогрес за темами граматики: засвоєні теми окремо, решта — від найслабшої. */
export function TopicMastery({ topics, mastered }: { topics: Summary['topics']; mastered: number }) {
  if (!topics.length) {
    return <p className="text-sm text-paper-muted">{t("Теми з’являться тут після перших вправ.")}</p>;
  }
  const inProgress = topics.filter((tp) => !tp.mastered).sort((a, b) => a.pct - b.pct || b.total - a.total);
  const done = topics.filter((tp) => tp.mastered);
  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-paper-muted">
        {t("Засвоєно")}: <span className="font-mono text-correct">{mastered}</span> · {t("у роботі")}:{' '}
        <span className="font-mono text-paper">{inProgress.length}</span>
      </p>
      {inProgress.length ? (
        <div>
          <p className="ww-label mb-2">{t("Потребують уваги")}</p>
          <ul className="flex flex-col gap-2">
            {inProgress.slice(0, 12).map((tp) => (
              <TopicRow key={tp.point} tp={tp} />
            ))}
          </ul>
        </div>
      ) : null}
      {done.length ? (
        <div>
          <p className="ww-label mb-2">{t("Засвоєні теми")}</p>
          <ul className="flex flex-col gap-2">
            {done.map((tp) => (
              <TopicRow key={tp.point} tp={tp} />
            ))}
          </ul>
        </div>
      ) : null}
      <p className="text-xs text-paper-muted">
        {t("Тема зараховується як засвоєна, коли відповідей з першої спроби не менше ніж")} {MASTERY_ACCURACY}% {t("і тема траплялася щонайменше у")}{' '}
        {MASTERY_MIN_LESSONS} {t("уроках")}.
      </p>
    </div>
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
