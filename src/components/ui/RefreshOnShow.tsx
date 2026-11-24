'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Сторінка з даними, що змінюються на іншому екрані (прогрес слів, домашка): оновлює їх одразу
 * при відкритті, при поверненні кнопкою «Назад» (bfcache) і коли вкладка знову стає видимою.
 */
export function RefreshOnShow() {
  const router = useRouter();
  useEffect(() => {
    router.refresh();
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) router.refresh();
    };
    const onVis = () => {
      if (document.visibilityState === 'visible') router.refresh();
    };
    window.addEventListener('pageshow', onShow);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('pageshow', onShow);
      document.removeEventListener('visibilitychange', onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
