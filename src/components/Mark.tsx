'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Знак Werba Way. Літера W лежить у кільці завжди, а знак — картинкою поверх неї:
 * доки картинка не доїхала (або не доїде ніколи), видно W, а не порожнє кільце.
 *
 * Ланцюжок webp → png → W через `onError` не рятував у двох випадках: запит падав ще до
 * гідратації, коли обробника onError на картинці не існує, і запит зависав без помилки,
 * тож onError не спрацьовував узагалі.
 *
 * Тому картинка невидима (opacity 0), доки справді не завантажиться: зависла або побита
 * картинка — це прозорий прямокутник, крізь який видно W. Раніше вона лишалася видимою
 * і разом із фоном від `className` (у шапці це `bg-white`) закривала W білим кружечком.
 * Фон на самій картинці нічого не псує лише тому, що до `onLoad` вона прозора.
 *
 * Знак у .webp і .png — без прозорості, тому завантажена картинка повністю перекриває W.
 */
export function Mark({ size = 44, className = '' }: { size?: number; className?: string }) {
  const [step, setStep] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLImageElement>(null);

  // картинка могла доїхати або впасти ще до гідратації — тоді onLoad/onError уже не спрацюють
  useEffect(() => {
    const img = ref.current;
    if (!img || !img.complete) return;
    if (img.naturalWidth > 0) setLoaded(true);
    else setStep((s) => Math.min(s + 1, 1));
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
        onLoad={() => setLoaded(true)}
        onError={() => setStep((s) => Math.min(s + 1, 1))}
        className={`relative z-[1] transition-opacity duration-200 ${loaded ? 'opacity-100' : 'opacity-0'} ${className}`}
      />
    </span>
  );
}
