'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useT } from '@/i18n/client';
import type { GuestRow } from '@/lib/guests';
import { LiveBadge } from '@/components/live/LiveBadge';
import { useLiveStatuses } from '@/components/live/useLiveStatuses';
import { guestTopic, isLessonPath } from '@/lib/live/protocol';
import { guestLabel } from '@/lib/guest';
import { relDay } from '@/lib/students';

/**
 * «Гості за посиланням»: хто відкривав лекції без акаунта. Хто зараз у лекції — нагорі,
 * і його екран можна дивитися наживо. Щойно гість зареєструється, він зникає звідси
 * й з'являється серед учнів разом зі своєю історією.
 */
export function GuestsPanel({ rows }: { rows: GuestRow[] }) {
  const t = useT();
  const topics = useMemo(() => rows.map((g) => guestTopic(g.vid)), [rows]);
  const live = useLiveStatuses(topics);

  const list = useMemo(() => {
    const rank = (g: GuestRow) => {
      const p = live[guestTopic(g.vid)];
      return p ? (p.mode === 'lesson' && isLessonPath(p.path) ? 0 : 1) : 2;
    };
    return rows.map((g, i) => ({ g, i })).sort((a, b) => rank(a.g) - rank(b.g) || a.i - b.i).map((x) => x.g);
  }, [rows, live]);

  if (!rows.length) return null;

  return (
    <section className="mt-12">
      <h2 className="mb-1 font-display text-2xl text-paper">{t("Гості за посиланням")}</h2>
      <p className="mb-4 text-sm text-paper-muted">
        {t("Відкрили лекцію за посиланням, без акаунта. Після реєстрації їхні лекції й відповіді переїдуть на акаунт.")}
      </p>
      <ul className="divide-y divide-ink-line overflow-hidden rounded-2xl border border-ink-line bg-ink-raised">
        {list.map((g) => {
          const mins = Math.round(g.seconds / 60);
          const facts = [
            g.ua,
            relDay(g.lastSeen),
            mins >= 1 ? t('{n} хв у лекціях', { n: mins }) : null,
            g.attempts ? t('{n} відповідей', { n: g.attempts }) : null,
            g.accuracy == null ? null : `${g.accuracy}%`,
          ].filter(Boolean);
          return (
            <li key={g.vid} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-paper">{guestLabel(g.num)}</span>
                <span className="block truncate text-xs text-paper-muted">{facts.join(' · ')}</span>
                {g.lessons.length > 0 && (
                  <span className="mt-1 flex flex-wrap gap-1.5">
                    {g.lessons.slice(0, 4).map((l) => (
                      <Link
                        key={l.slug}
                        href={`/learn/${l.slug}`}
                        className="rounded-full bg-ink-soft px-2 py-0.5 text-[11px] text-paper-muted hover:text-gold"
                      >
                        {l.title}
                      </Link>
                    ))}
                    {g.lessons.length > 4 && <span className="text-[11px] text-paper-muted">+{g.lessons.length - 4}</span>}
                  </span>
                )}
              </span>
              <LiveBadge watchHref={`/teacher/guests/${g.vid}/watch`} status={live[guestTopic(g.vid)]} />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
