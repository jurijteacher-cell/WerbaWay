'use client';

import { useEffect } from 'react';

/**
 * Вправа в iframe не має власного скролу: вона повідомляє сторінці свою повну висоту
 * (`ww:embed-height`), а сторінка розтягує iframe (EmbedFrame). Це «одна сторінка», а не «вікно у вікні».
 *
 * Зворотний канал — `ww:viewport`: сторінка каже, яку частину iframe зараз видно, і ми кладемо
 * це в CSS-змінні `--ww-vt` / `--ww-vh`. За ними бокове меню іспиту, панель паузи й вікно входу
 * лишаються на екрані, хоч сам iframe вищий за екран (position: sticky/fixed у такому iframe не діють).
 *
 * Поза iframe (вправа відкрита окремо) компонент нічого не робить.
 */
export function FrameSync() {
  useEffect(() => {
    if (window.parent === window) return;
    const root = document.documentElement;
    root.classList.add('ww-framed');

    const shell = document.querySelector<HTMLElement>('.embed-shell') ?? document.body;
    let last = -1;
    let raf = 0;
    const send = () => {
      raf = 0;
      const h = Math.ceil(shell.getBoundingClientRect().height);
      if (h === last || h < 40) return;
      last = h;
      window.parent.postMessage({ type: 'ww:embed-height', height: h, path: location.pathname }, '*');
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(send);
    };
    const ro = new ResizeObserver(schedule);
    ro.observe(shell);
    // вміст міняється й без зміни розміру оболонки (шрифти, зображення) — підстраховка
    const mo = new MutationObserver(schedule);
    mo.observe(shell, { childList: true, subtree: true, attributes: true, characterData: true });
    window.addEventListener('load', schedule);
    schedule();

    const onMsg = (e: MessageEvent) => {
      if (e.source !== window.parent) return;
      const d = e.data as { type?: string; top?: number; height?: number } | null;
      if (!d || d.type !== 'ww:viewport') return;
      root.style.setProperty('--ww-vt', `${Math.max(0, Math.round(d.top ?? 0))}px`);
      root.style.setProperty('--ww-vh', `${Math.max(0, Math.round(d.height ?? 0))}px`);
    };
    window.addEventListener('message', onMsg);
    // вікно просить видимий фрагмент одразу після завантаження
    window.parent.postMessage({ type: 'ww:embed-ready' }, '*');

    return () => {
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener('load', schedule);
      window.removeEventListener('message', onMsg);
      if (raf) cancelAnimationFrame(raf);
      root.classList.remove('ww-framed');
    };
  }, []);

  return null;
}
