'use client';


import { useT } from '@/i18n/client';
import Link from 'next/link';
import { useState } from 'react';
import { ShareButton } from './ShareButton';

export type CourseCard = { slug: string; title: string; icon?: string; cover?: string; level?: string; number?: number };

const VISIBLE = 3;

function Card({ p, canShare }: { p: CourseCard; canShare?: boolean }) {
  const t = useT();
  return (
    <div className="relative">
    <Link
      href={`/learn/${p.slug}`}
      className="group block h-full overflow-hidden rounded-2xl border border-ink-line bg-ink-raised shadow-[0_1px_0_#e6ebf8] transition-all hover:-translate-y-0.5 hover:border-gold/60 hover:shadow-[0_12px_26px_-20px_rgba(28,35,72,.6)]"
    >
      <div className="relative">
        {p.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.cover} alt="" loading="lazy" className="h-36 w-full object-cover" />
        ) : (
          <div className="h-36 w-full bg-ink-soft" />
        )}
        <span
          aria-hidden="true"
          className="absolute -bottom-5 left-4 grid h-11 w-11 -rotate-3 place-items-center rounded-xl border border-ink-line bg-ink-raised text-2xl shadow-sm"
        >
          {p.icon ?? '📘'}
        </span>
      </div>
      <div className="px-4 pb-4 pt-7">
        <h3 className="font-display text-lg leading-snug text-paper group-hover:text-gold-bright">{p.title}</h3>
        <p className="mt-1 text-sm text-paper-muted">{[p.level, p.number != null ? t('урок {n}', { n: p.number }) : null].filter(Boolean).join(', ')}</p>
      </div>
    </Link>
      {canShare && (
        <div className="absolute right-3 top-3">
          <ShareButton slug={p.slug} title={p.title} compact />
        </div>
      )}
    </div>
  );
}

/** Курс: перші три лекції видно одразу, решта розгортається кнопкою */
export function CourseGroup({ id, title, pages, canShare }: { id: string; title: string; pages: CourseCard[]; canShare?: boolean }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const rest = pages.slice(VISIBLE);
  return (
    <section id={id} className="mb-12 scroll-mt-6">
      <h2 className="mb-4 font-display text-2xl text-paper">
        {title} <span className="text-base font-normal text-paper-muted">{pages.length}</span>
      </h2>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {pages.slice(0, VISIBLE).map((p) => (
          <Card key={p.slug} p={p} canShare={canShare} />
        ))}
      </div>
      {rest.length > 0 && (
        <>
          {/* плавне розгортання: висота 0fr → 1fr */}
          <div
            className="grid transition-[grid-template-rows,opacity] duration-500 ease-out"
            style={{ gridTemplateRows: open ? '1fr' : '0fr', opacity: open ? 1 : 0 }}
            aria-hidden={!open}
          >
            <div className="overflow-hidden">
              <div className="grid gap-5 pt-5 sm:grid-cols-2 lg:grid-cols-3">
                {open && rest.map((p) => <Card key={p.slug} p={p} canShare={canShare} />)}
              </div>
            </div>
          </div>
          <div className="mt-4 flex justify-center">
            <button type="button" onClick={() => setOpen((o) => !o)} className="ww-btn ww-btn-secondary" aria-expanded={open}>
              {open ? t("Згорнути ↑") : t('Показати ще {n} ↓', { n: rest.length })}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
