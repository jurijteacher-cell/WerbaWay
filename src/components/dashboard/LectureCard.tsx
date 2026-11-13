import Link from 'next/link';
import { gradeLabel, type LectureStats } from '@/lib/lecture-stats';
import { t } from '@/i18n/server';

type Props = {
  slug: string;
  title: string;
  level?: string;
  icon?: string;
  cover?: string;
  stats: LectureStats;
  /** дата завершення лекції викладачем */
  completedAt?: string | null;
  homework?: { assigned: boolean; done: boolean } | null;
  fmt: (iso: string) => string;
};

const TONE = {
  good: { ring: '#0f7a55', chip: 'bg-correct/10 text-correct' },
  ok: { ring: '#6b46d6', chip: 'bg-gold-fill/60 text-paper' },
  weak: { ring: '#cf3a57', chip: 'bg-incorrect/10 text-incorrect' },
  none: { ring: '#9aa3b5', chip: 'bg-ink-soft text-paper-muted' },
} as const;

/** Кільце оцінки: заповнена дуга = відсоток, у центрі число */
function Ring({ value, color }: { value: number | null; color: string }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  const v = value ?? 0;
  return (
    <svg viewBox="0 0 76 76" width="76" height="76" role="img" aria-label={value == null ? t("не оцінено") : `оцінка ${value}%`}>
      <circle cx="38" cy="38" r={r} fill="none" stroke="#e4e9f7" strokeWidth="8" />
      {value != null && (
        <circle
          cx="38"
          cy="38"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${(v / 100) * c} ${c}`}
          transform="rotate(-90 38 38)"
        />
      )}
      <text x="38" y="43" textAnchor="middle" fontSize="17" fontWeight="700" fill="#1c2348">
        {value == null ? '—' : `${value}%`}
      </text>
    </svg>
  );
}

function Bar({ label, p, done, total }: { label: string; p: number | null; done: number; total: number }) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-xs">
        <span className="text-paper-muted">{label}</span>
        <span className="font-mono text-paper">
          {p == null ? '—' : `${p}%`}
          {total > 0 && <span className="ml-1 text-paper-muted">({done}/{total})</span>}
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-ink-line/70">
        <div
          className="h-full rounded-full bg-gold-fill"
          style={{ width: `${p ?? 0}%`, boxShadow: p ? 'inset 0 -2px 0 rgba(138,95,23,.25)' : undefined }}
        />
      </div>
    </div>
  );
}

export function LectureCard({ slug, title, level, icon, cover, stats, completedAt, homework, fmt }: Props) {
  const g = gradeLabel(stats.grade);
  const tone = TONE[g.tone];
  const hwState = !homework?.assigned
    ? null
    : homework.done
      ? { text: t("✓ домашку здано"), cls: 'bg-correct/10 text-correct' }
      : { text: t("📝 домашка чекає"), cls: 'bg-gold-fill/70 text-paper' };

  return (
    <article className="overflow-hidden rounded-2xl border border-ink-line bg-ink-raised shadow-[0_1px_0_rgba(28,35,72,.04)]">
      {cover && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cover} alt="" className="h-20 w-full object-cover" loading="lazy" />
      )}
      <div className="p-4">
        <div className="mb-3 flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="mb-1 flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-gold-dim">
              {level && <span className="rounded bg-gold-fill px-1.5 py-0.5 text-paper">{level}</span>}
              {completedAt ? <span>пройдено {fmt(completedAt)}</span> : stats.touched ? <span>{t("в процесі")}</span> : null}
            </p>
            <Link href={`/learn/${slug}`} className="font-display text-lg leading-snug text-paper hover:text-gold">
              {icon} {title}
            </Link>
          </div>
          <div className="shrink-0 text-center">
            <Ring value={stats.grade} color={tone.ring} />
            <p className={`mt-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${tone.chip}`}>{g.text}</p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Bar label={t("Лекція — пройдено")} p={stats.lecture.pct} done={stats.lecture.done} total={stats.lecture.total} />
          {stats.homework.total > 0 && (
            <Bar label={t("Домашка — виконано")} p={stats.homework.pct} done={stats.homework.done} total={stats.homework.total} />
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
          {stats.grade != null && (
            <span className="text-paper-muted">
              Оцінка = правильно з першої спроби: {stats.lecture.gradedOk + stats.homework.gradedOk} з{' '}
              {stats.lecture.gradedTotal + stats.homework.gradedTotal}
            </span>
          )}
          {hwState && <span className={`ml-auto rounded-full px-2.5 py-1 font-medium ${hwState.cls}`}>{hwState.text}</span>}
          {homework?.assigned && !homework.done && (
            <Link href={`/learn/${slug}/hw`} className="font-medium text-gold hover:text-gold-bright">
              виконати →
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
