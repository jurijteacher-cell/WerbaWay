'use client';

import { useT } from '@/i18n/client';
import { useEffect, useState } from 'react';
import { CourseGroup, type CourseCard } from './CourseGroup';
import type { CourseOption } from './MoveButton';
import type { CategoryDef, CategoryId } from '@/lib/pages/categories';

export type LearnCategory = CategoryDef & {
  groups: { code: string; title: string; pages: CourseCard[] }[];
};

const KEY = 'ww_learn_cat';

/**
 * «Курс»: ряд плиток-категорій (A0 → B2 — етапи фенікса, далі спеціальні задачі),
 * під ним — курси лише вибраної категорії. Вибір живе в ?cat= і пам'ятається в браузері;
 * посилання /learn#course-<код> (пошук) відкриває категорію цього курсу.
 */
export function LearnCategories({
  categories,
  initial,
  canShare,
  courseOptions,
}: {
  categories: LearnCategory[];
  initial: CategoryId | null;
  canShare?: boolean;
  courseOptions?: CourseOption[];
}) {
  const t = useT();
  const first = categories[0]?.id ?? null;
  const [cat, setCat] = useState<CategoryId | null>(initial ?? first);

  // після гідрації: #course-<код> або збережений вибір
  useEffect(() => {
    const hash = decodeURIComponent(window.location.hash.replace(/^#course-/, ''));
    if (hash && window.location.hash.startsWith('#course-')) {
      const owner = categories.find((c) => c.groups.some((g) => (g.code || 'other') === hash));
      if (owner) {
        setCat(owner.id);
        requestAnimationFrame(() => document.getElementById(`course-${hash}`)?.scrollIntoView({ block: 'start' }));
        return;
      }
    }
    if (initial) return;
    try {
      const saved = window.localStorage.getItem(KEY) as CategoryId | null;
      if (saved && categories.some((c) => c.id === saved)) setCat(saved);
    } catch {
      /* сховище недоступне — лишаємо першу категорію */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pick = (id: CategoryId) => {
    setCat(id);
    try {
      window.localStorage.setItem(KEY, id);
    } catch {
      /* нічого */
    }
    const url = new URL(window.location.href);
    url.searchParams.set('cat', id);
    url.hash = '';
    window.history.replaceState(null, '', url.toString());
  };

  if (categories.length === 0) return null;
  const current = categories.find((c) => c.id === cat) ?? categories[0];
  const levels = categories.filter((c) => c.kind === 'level');
  const special = categories.filter((c) => c.kind === 'special');
  const count = (c: LearnCategory) => c.groups.reduce((s, g) => s + g.pages.length, 0);

  const Tile = (c: LearnCategory) => (
    <button
      key={c.id}
      type="button"
      role="tab"
      aria-selected={c.id === current.id}
      aria-controls="learn-panel"
      onClick={() => pick(c.id)}
      className={`ww-cat ww-cat-${c.id}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={c.img} alt="" width={80} height={80} className="ww-cat-img" />
      <span className="ww-cat-label">{c.kind === 'level' ? c.label : t(c.label)}</span>
      <span className="ww-cat-hint">{t(c.hint)}</span>
      <span className="ww-cat-count">{count(c)}</span>
    </button>
  );

  return (
    <>
      <div className="ww-cats" role="tablist" aria-label={t('Категорії курсу')}>
        {levels.length > 0 && (
          <div className="ww-cats-group">
            <p className="ww-label">{t('Рівні')}</p>
            <div className="ww-cats-row">{levels.map(Tile)}</div>
          </div>
        )}
        {special.length > 0 && (
          <div className="ww-cats-group">
            <p className="ww-label">{t('Спеціальні задачі')}</p>
            <div className="ww-cats-row">{special.map(Tile)}</div>
          </div>
        )}
      </div>

      <div id="learn-panel" role="tabpanel" key={current.id} className="ww-cat-panel">
        {current.groups.map((g) => (
          <CourseGroup
            key={g.code || g.title}
            canShare={canShare}
            courseOptions={courseOptions}
            currentCode={g.code}
            id={`course-${g.code || 'other'}`}
            title={g.title}
            pages={g.pages}
          />
        ))}
      </div>
    </>
  );
}
