'use client';

import { Playfair_Display } from 'next/font/google';
import { BLOOM_SVG } from './logo-bloom-svg';
import './logo-bloom.css';

// W у логотипі — шрифт із засічками; підключаємо лише тут (вхід, реєстрація)
const playfair = Playfair_Display({ subsets: ['latin'], weight: '500', display: 'swap', variable: '--font-playfair' });

/**
 * Логотип Werba Way, що «розпускається»: стебло проростає з W, листочки-прапори
 * (Україна, Велика Британія, Іспанія, Німеччина, Франція, Польща) розкриваються по черзі.
 * Грає один раз при відкритті сторінки; при prefers-reduced-motion — одразу готовий.
 */
export function LogoBloom() {
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
