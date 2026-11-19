'use client';

import { useEffect } from 'react';
import { Playfair_Display } from 'next/font/google';
import { BLOOM_SEEN_ATTR, BLOOM_SEEN_KEY } from './logo-bloom-seen';
import { BLOOM_SVG } from './logo-bloom-svg';
import './logo-bloom.css';

// W у логотипі — шрифт із засічками; підключаємо лише тут (вхід, реєстрація)
const playfair = Playfair_Display({ subsets: ['latin'], weight: '500', display: 'swap', variable: '--font-playfair' });

/** скільки грає анімація (останній листок: .5 с затримки + .75 с) — із запасом */
const BLOOM_MS = 2100;

/**
 * Логотип Werba Way, що «розпускається»: стебло проростає з W, листочки-прапори
 * (Україна, Велика Британія, Іспанія, Німеччина, Франція, Польща) розкриваються по черзі.
 *
 * Грає ОДИН раз за відвідування: перший екран (вхід, реєстрація, запрошення, «пошту
 * підтверджено») — з анімацією, а далі логотип одразу готовий, хоч би куди учень переходив
 * чи оновлював сторінку. Позначку ставимо на <html> (`data-ww-bloom="seen"`), CSS вимикає
 * анімацію; після перезавантаження її до першого кадру відновлює скрипт у layout.tsx
 * (за sessionStorage), тож логотип не «блимає». prefers-reduced-motion — одразу готовий.
 */
export function LogoBloom() {
  useEffect(() => {
    const root = document.documentElement;
    if (root.getAttribute(BLOOM_SEEN_ATTR) === 'seen') return;
    try {
      sessionStorage.setItem(BLOOM_SEEN_KEY, '1');
    } catch {
      /* приватний режим — позначка на <html> однаково діє до перезавантаження */
    }
    const done = () => root.setAttribute(BLOOM_SEEN_ATTR, 'seen');
    const id = setTimeout(done, BLOOM_MS);
    // пішли зі сторінки раніше, ніж анімація дограла, — вона однаково вже показана
    return () => {
      clearTimeout(id);
      done();
    };
  }, []);

  return (
    <div
      className={`ww-bloom ${playfair.variable}`}
      role="img"
      aria-label="Werba Way"
      // статичний SVG із репо, без даних користувача
      dangerouslySetInnerHTML={{ __html: BLOOM_SVG }}
    />
  );
}
