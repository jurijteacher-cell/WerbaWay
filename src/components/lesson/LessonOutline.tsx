'use client';

import { useEffect, useState } from 'react';

type Item = { id: string; label: string; num: string | null };

/** Зміст лекції: на широкому екрані — липка колонка праворуч із поточним розділом, на вузькому — рядок кнопок */
export function LessonOutline({ items }: { items: Item[] }) {
  const [active, setActive] = useState<string | null>(items[0]?.id ?? null);

  useEffect(() => {
    const els = items.map((i) => document.getElementById(i.id)).filter((e): e is HTMLElement => !!e);
    if (!els.length) return;
    let raf = 0;
    // поточний розділ = останній заголовок, що вже піднявся у верхню третину екрана
    const update = () => {
      raf = 0;
      const line = window.innerHeight * 0.33;
      let cur = els[0].id;
      for (const el of els) if (el.getBoundingClientRect().top <= line) cur = el.id;
      setActive(cur);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [items]);

  return (
    <nav className="lp-outline" aria-label="Зміст лекції">
      <p className="lp-outline-title">Зміст</p>
      <ol>
        {items.map((i) => (
          <li key={i.id}>
            <a href={`#${i.id}`} aria-current={active === i.id ? 'location' : undefined}>
              <span className="lp-outline-num">{i.num ?? '·'}</span>
              <span>{i.label}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
