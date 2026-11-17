'use client';

import { useEffect } from 'react';

/**
 * Вправа повідомляє батьківській сторінці свою справжню висоту.
 *
 * Раніше вікно вправи мало фіксовану висоту (`min(900px, 88vh)`), а вміст
 * домашки — під 1700 px. На телефоні це давало скрол усередині скролу: палець
 * гортає вправу, а сторінка під нею їде сама. Тепер лекція підганяє висоту
 * iframe під вміст, і скрол лишається один.
 *
 * Notion та інші чужі сторінки просто ігнорують це повідомлення.
 */
export function HeightReporter() {
  useEffect(() => {
    if (window.parent === window) return;

    let last = 0;
    const send = () => {
      const h = Math.ceil(document.documentElement.scrollHeight);
      // дрібні коливання (курсор, фокус) не ганяємо через postMessage
      if (!h || Math.abs(h - last) < 24) return;
      last = h;
      window.parent.postMessage({ type: 'ww:embed-height', height: h }, '*');
    };

    send();
    const ro = new ResizeObserver(send);
    ro.observe(document.documentElement);
    // вкладки вправ міняють вміст без зміни розміру кореня
    const t = setInterval(send, 1000);
    window.addEventListener('load', send);

    return () => {
      ro.disconnect();
      clearInterval(t);
      window.removeEventListener('load', send);
    };
  }, []);

  return null;
}
