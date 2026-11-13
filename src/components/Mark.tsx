'use client';

import { useState } from 'react';

/**
 * Знак Werba Way. Легкий webp (2.8 КБ замість 36), а якщо він чомусь не доїхав —
 * підміняється на png, і лише потім на літеру. Так на місці лого ніколи не лишається порожнє кільце.
 */
export function Mark({ size = 44, className = '' }: { size?: number; className?: string }) {
  const [step, setStep] = useState(0);
  if (step > 1)
    return (
      <span
        className={`grid place-items-center rounded-full bg-white font-display font-bold text-[#151c3c] ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.52 }}
        aria-hidden="true"
      >
        W
      </span>
    );
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={step === 0 ? '/brand/werba-mark-128.webp' : '/brand/werba-mark.png'}
      alt=""
      width={size}
      height={size}
      decoding="async"
      onError={() => setStep((s) => s + 1)}
      className={className}
    />
  );
}
