'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Знак Werba Way. Літера W лежить у кільці завжди, а знак — картинкою поверх неї:
 * доки картинка не доїхала (або не доїде ніколи), видно W, а не порожнє кільце.
 *
 * Попередній підхід — ланцюжок webp → png → W через `onError` — не рятував у двох випадках:
 * запит падав ще до гідратації, коли обробника onError на картинці просто не існує, і
 * запит зависав без помилки, тож onError не спрацьовував узагалі. Обидва дають порожнє кільце.
 * Тепер помилка перемикає лише webp → png, а видимість W від неї не залежить.
 *
 * Знак у .webp і .png — без прозорості, тому завантажена картинка повністю перекриває W.
 */
export function Mark({ size = 44, className = '' }: { size?: number; className?: string }) {
  const [step, setStep] = useState(0);
  const ref = useRef<HTMLImageElement>(null);

  // картинка могла впасти ще до гідратації — тоді onError уже не спрацює, перевіряємо самі
  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) setStep((s) => Math.min(s + 1, 1));
  }, [step]);

  return (
    <span className={`relative grid place-items-center ${className}`}>
      <span
        aria-hidden="true"
        className="absolute inset-0 grid place-items-center rounded-full bg-white font-display font-bold text-[#151c3c]"
        style={{ fontSize: size * 0.52 }}
      >
        W
      </span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={ref}
        key={step}
        src={step === 0 ? '/brand/werba-mark-128.webp' : '/brand/werba-mark.png'}
        alt=""
        width={size}
        height={size}
        decoding="async"
        fetchPriority="high"
        onError={() => setStep((s) => Math.min(s + 1, 1))}
        className={`relative z-[1] ${className}`}
      />
    </span>
  );
}
