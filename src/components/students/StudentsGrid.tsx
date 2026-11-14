'use client';


import { useT } from '@/i18n/client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { StudentRow } from '@/lib/students';
import { avatarColor, initials, relDay } from '@/lib/students';

type Filter = 'all' | 'active' | 'account' | 'notion';
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Усі' },
  { id: 'active', label: 'Активні за тиждень' },
  { id: 'account', label: 'З акаунтом' },
  { id: 'notion', label: 'Лише Notion' },
];

function Spark({ data }: { data: number[] }) {
  const t = useT();
  const max = Math.max(1, ...data);
  return (
    <div className="flex h-9 items-end gap-[3px]" aria-label={t("Активність за 14 днів")}>
      {data.map((n, i) => (
        <span
          key={i}
          className="w-full rounded-sm"
          style={{
            height: n ? `${Math.max(14, (n / max) * 100)}%` : '3px',
            // цей тиждень — суцільний фіолет, попередній — світліший; різниця в яскравості, не лише в тоні
            background: n ? (i >= data.length - 7 ? 'var(--ww-violet-solid)' : 'var(--ww-violet-shadow)') : 'var(--ww-line)',
          }}
        />
      ))}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: 'good' | 'warn' | 'bad' }) {
  const color = tone === 'good' ? 'text-correct' : tone === 'bad' ? 'text-incorrect' : tone === 'warn' ? 'text-gold' : 'text-paper';
  return (
    <div className="min-w-0">
      <p className={`font-display text-lg leading-none ${color}`}>{value}</p>
      <p className="mt-1 truncate text-[11px] text-paper-muted">{label}</p>
    </div>
  );
}

export function StudentsGrid({ rows }: { rows: StudentRow[] }) {
  const t = useT();
  const [q, setQ] = useState('');
  const [f, setF] = useState<Filter>('all');
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (!s || r.name.toLowerCase().includes(s)) &&
        (f === 'all' || (f === 'active' && r.activeDays7 > 0) || (f === 'account' && r.hasAccount) || (f === 'notion' && !r.hasAccount))
    );
  }, [rows, q, f]);

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("Пошук за іменем")}
          className="ww-input min-w-0 flex-1 basis-56 px-4 py-2 placeholder:text-paper-muted"
        />
        <div className="ww-nav max-w-full overflow-x-auto [scrollbar-width:none]">
          {FILTERS.map((x) => (
            <button key={x.id} type="button" onClick={() => setF(x.id)} className="ww-nav-link" aria-current={f === x.id ? 'page' : undefined}>
              {t(x.label)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((r) => {
          const acc = r.accuracy;
          return (
            <Link
              key={r.key}
              href={`/teacher/students/${r.key}`}
              className="group flex flex-col gap-4 rounded-2xl border border-ink-line bg-ink-raised p-4 shadow-[0_1px_0_#e6ebf8] transition-all hover:-translate-y-0.5 hover:border-gold/60 hover:shadow-[0_10px_24px_-18px_rgba(28,35,72,.55)]"
            >
              <div className="flex items-center gap-3">
                <span
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-bold text-paper"
                  style={{ background: avatarColor(r.name) }}
                  aria-hidden="true"
                >
                  {initials(r.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-lg leading-tight text-paper group-hover:text-gold-bright">{r.name}</p>
                  <p className="text-xs text-paper-muted">
                    {relDay(r.lastAt)}
                    {!r.hasAccount && <span className="ml-2 rounded bg-ink-soft px-1.5 py-0.5">{t("лише Notion")}</span>}
                  </p>
                </div>
                {r.homeworkTodo > 0 && (
                  <span className="shrink-0 rounded-full bg-[#f4b7c5] px-2 py-0.5 text-[11px] font-semibold text-paper" title={t("Домашка чекає")}>
                    📝 {r.homeworkTodo}
                  </span>
                )}
              </div>
              <Spark data={r.spark} />
              <div className="grid grid-cols-4 gap-2 border-t border-dashed border-ink-line pt-3">
                <Stat label={t("лекцій")} value={r.hasAccount ? r.lecturesDone : '—'} />
                <Stat label={t("оцінка")} value={acc == null ? '—' : `${acc}%`} tone={acc == null ? undefined : acc >= 80 ? 'good' : acc >= 60 ? 'warn' : 'bad'} />
                <Stat label={t("відповідей")} value={r.attempts} />
                <Stat label={t("слів")} value={r.hasAccount ? r.wordsKnown : '—'} />
              </div>
            </Link>
          );
        })}
      </div>
      {list.length === 0 && <p className="py-10 text-center text-paper-muted">{t("Нікого не знайдено.")}</p>}
    </>
  );
}
