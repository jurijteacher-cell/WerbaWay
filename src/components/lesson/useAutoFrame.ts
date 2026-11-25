'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

/**
 * Сторінка-господар iframe-вправи: слухає `ww:embed-height` (див. FrameSync), віддає висоту
 * й повідомляє вправі, яку її частину видно (`ww:viewport`). Без цього вправа була б «вікном у вікні».
 */
export function useAutoFrame(frameRef: RefObject<HTMLIFrameElement>, enabled: boolean, onReady?: () => void) {
  const [height, setHeight] = useState<number | null>(null);
  const readyRef = useRef(onReady);
  readyRef.current = onReady;

  const sendViewport = useCallback(() => {
    const el = frameRef.current;
    if (!el?.contentWindow) return;
    const r = el.getBoundingClientRect();
    const vh = window.innerHeight;
    const top = Math.min(Math.max(-r.top, 0), r.height);
    const visible = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0));
    el.contentWindow.postMessage({ type: 'ww:viewport', top, height: visible || vh }, '*');
  }, [frameRef]);

  useEffect(() => {
    if (!enabled) return;
    let raf = 0;
    const sync = () => {
      if (!raf) raf = requestAnimationFrame(() => { raf = 0; sendViewport(); });
    };
    const onMsg = (e: MessageEvent) => {
      const el = frameRef.current;
      if (!el || e.source !== el.contentWindow) return;
      const d = e.data as { type?: string; height?: number } | null;
      if (d?.type === 'ww:embed-height' && typeof d.height === 'number') {
        setHeight(Math.max(Math.round(d.height), 120));
        readyRef.current?.();
        sync();
      } else if (d?.type === 'ww:embed-ready') sync();
    };
    window.addEventListener('message', onMsg);
    window.addEventListener('scroll', sync, { passive: true, capture: true });
    window.addEventListener('resize', sync);
    return () => {
      window.removeEventListener('message', onMsg);
      window.removeEventListener('scroll', sync, { capture: true } as EventListenerOptions);
      window.removeEventListener('resize', sync);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [enabled, frameRef, sendViewport]);

  return { height, sendViewport };
}
