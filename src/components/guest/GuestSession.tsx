'use client';

import { useEffect, useRef, useState } from 'react';
import { GuestBeacon } from '@/components/live/LiveBeacon';
import { ensureVid, guestLabel } from '@/lib/guest';

/** пульс раз на хвилину: і «гість досі тут», і час на лекції */
const PULSE_MS = 60_000;

function shortUa(): string {
  const ua = navigator.userAgent;
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /OPR\/|Opera/.test(ua)
      ? 'Opera'
      : /Chrome\//.test(ua)
        ? 'Chrome'
        : /Firefox\//.test(ua)
          ? 'Firefox'
          : /Safari\//.test(ua)
            ? 'Safari'
            : 'Браузер';
  const os = /Android/.test(ua)
    ? 'Android'
    : /iPhone|iPad|iPod/.test(ua)
      ? 'iOS'
      : /Mac OS X/.test(ua)
        ? 'macOS'
        : /Windows/.test(ua)
          ? 'Windows'
          : /Linux/.test(ua)
            ? 'Linux'
            : '';
  return os ? `${browser} · ${os}` : browser;
}

/**
 * Гість відкрив лекцію за посиланням. Робить дві речі:
 *  • пише в базу, що цей браузер відкривав цю лекцію і скільки часу в ній був (guest_touch);
 *  • тримає канал guest:<vid>, щоб викладач міг дивитися екран наживо.
 * Рендериться лише для гостя (PublicBar): учень з акаунтом має звичайний LiveBeacon у TopNav.
 */
export function GuestSession({ token }: { token: string }) {
  const [vid, setVid] = useState<string | null>(null);
  const [num, setNum] = useState<number | null>(null);
  // мілісекунди на сторінці, ще не відправлені
  const accRef = useRef(0);
  const sinceRef = useRef<number | null>(null);
  // база не підтвердила гостя (посилання вимкнули) — більше не пишемо й канал не відкриваємо
  const liveRef = useRef(true);

  useEffect(() => {
    const id = ensureVid();
    if (!id) return; // куки заблоковані — лекція все одно працює, просто без обліку
    liveRef.current = true;
    setVid(id);

    sinceRef.current = document.visibilityState === 'visible' ? Date.now() : null;
    const harvest = () => {
      if (sinceRef.current != null) {
        accRef.current += Date.now() - sinceRef.current;
        sinceRef.current = Date.now();
      }
    };

    let alive = true;
    const send = (open: boolean, keepalive = false) => {
      if (!liveRef.current) return;
      harvest();
      const seconds = Math.round(accRef.current / 1000);
      if (!open && seconds < 5) return;
      accRef.current -= seconds * 1000;
      const body = JSON.stringify({ token, open, seconds, ua: open ? shortUa() : undefined });
      void fetch('/api/guest/touch', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body, keepalive })
        .then((r) => (r.ok ? r.json() : null))
        .then((d: { ok?: boolean; num?: number } | null) => {
          if (!alive) return;
          // ok:false — посилання вимкнули; null — запит не вдався. Лекція працює, обліку немає.
          if (!d?.ok) {
            liveRef.current = false;
            setVid(null);
            return;
          }
          if (typeof d.num === 'number') setNum(d.num);
        })
        .catch(() => undefined);
    };

    send(true);
    const timer = setInterval(() => send(false), PULSE_MS);
    const onVisible = () => {
      harvest();
      if (document.visibilityState === 'visible') {
        sinceRef.current = Date.now();
      } else {
        sinceRef.current = null;
        send(false);
      }
    };
    const onLeave = () => send(false, true);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pagehide', onLeave);
    return () => {
      alive = false;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pagehide', onLeave);
      onLeave();
    };
  }, [token]);

  // канал відкриваємо лише після підтвердження від бази — тоді ж відомий і підпис «Гість N»
  if (!vid || num === null) return null;
  return <GuestBeacon visitorId={vid} name={guestLabel(num)} />;
}
