'use client';

import { useEffect } from 'react';
import { FRAME_TAG, elementAtPath, shortText } from '@/lib/class/protocol';

/**
 * Class mode inside an exercise/slides page. Active only when the page is opened by /class
 * (`?class=1`, inside an iframe of the same site). Records the page DOM with rrweb (without mouse
 * movement) and hands every event to the parent; applies the teacher's commands (take a fresh snapshot, click an element).
 * Renders nothing. Outside class mode it does nothing and loads nothing.
 */
export function ClassAgent() {
  useEffect(() => {
    let inClass = false;
    try {
      inClass = window.parent !== window && new URLSearchParams(window.location.search).get('class') === '1';
    } catch {
      /* no access to location — not in class */
    }
    if (!inClass) return;

    let stop: (() => void) | null | undefined;
    let rec: typeof import('rrweb').record | null = null;
    let cancelled = false;
    const origin = window.location.origin;
    const post = (m: Record<string, unknown>) => window.parent.postMessage({ ww: FRAME_TAG, ...m }, origin);

    (async () => {
      const [{ record }, { pack }] = await Promise.all([import('rrweb'), import('@rrweb/packer')]);
      if (cancelled) return;
      rec = record;
      stop = record({
        emit: (e) => post({ k: 'ev', e }),
        packFn: pack,
        inlineStylesheet: true,
        recordCanvas: false,
        // курсор учня викладачеві не потрібен — пишемо лише те, що він вибрав або ввів
        sampling: { mousemove: false, scroll: 120, input: 'last' },
      });
      post({ k: 'ready' });
    })();

    const onMessage = (ev: MessageEvent) => {
      if (ev.origin !== origin || ev.source !== window.parent) return;
      const m = ev.data;
      if (!m || m.ww !== FRAME_TAG || !rec) return;
      if (m.k === 'scroll' && typeof m.dy === 'number') {
        window.scrollBy({ top: m.dy, behavior: 'auto' });
      } else if (m.k === 'need-snap') {
        rec.takeFullSnapshot(true);
      } else if (m.k === 'click' && Number.isInteger(m.id)) {
        const fits = (e: Element | null | undefined) =>
          !!e && (!m.tag || e.tagName === m.tag) && (!m.text || shortText(e) === m.text);
        const byId = rec.mirror.getNode(m.id);
        let el: Element | null = byId instanceof Element ? byId : (byId?.parentElement ?? null);
        if (!fits(el) && Array.isArray(m.path)) el = elementAtPath(document, m.path);
        if (el && fits(el)) (el as HTMLElement).click();
      }
    };
    window.addEventListener('message', onMessage);

    return () => {
      cancelled = true;
      window.removeEventListener('message', onMessage);
      stop?.();
    };
  }, []);

  return null;
}
