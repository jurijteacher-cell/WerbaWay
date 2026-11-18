'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { forgetVid, readVid } from '@/lib/guest';

/**
 * Учень щойно зареєструвався або увійшов, а в цьому браузері є кука гостя (ww_vid):
 * переносимо на акаунт лекції, які він дивився за посиланням, і його відповіді у вправах.
 * Одна точка для всіх способів входу — пошта, Google, лист-підтвердження.
 * Після перенесення кука зникає, тож удруге це не повториться.
 */
export function GuestClaim() {
  const router = useRouter();
  const started = useRef(false);

  useEffect(() => {
    if (started.current || !readVid()) return;
    started.current = true;
    void fetch('/api/guest/claim', { method: 'POST' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { result?: string } | null) => {
        if (!d?.result || d.result === 'error') return; // спробуємо наступного разу
        forgetVid();
        if (d.result === 'ok') router.refresh(); // лекції вже в «Курсі» й в історії
      })
      .catch(() => undefined);
  }, [router]);

  return null;
}
