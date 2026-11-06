'use client';

import { useEffect, useRef, useState } from 'react';
import { MousePointerClick } from 'lucide-react';

/**
 * Notion takes keyboard focus back from an embed as soon as the pointer leaves it, so a student
 * typing in a gap suddenly types into nothing. This keeps the place:
 *  - remembers the last text field and caret position;
 *  - when the iframe loses focus while a field was active → the field is marked «paused»;
 *  - when the pointer comes back over the exercise (within a minute) → focus + caret are restored;
 *  - if the browser refuses to move focus without a click, a bar «Kliknij, żeby pisać dalej»
 *    appears; one click anywhere in the exercise restores the field.
 * Rendered once in the embed layout. Embed-only: nb-* classes.
 */
type Field = HTMLInputElement | HTMLTextAreaElement;

const isField = (el: EventTarget | null): el is Field =>
  (el instanceof HTMLInputElement && /^(text|search|)$/.test(el.type)) || el instanceof HTMLTextAreaElement;

export function FocusKeeper() {
  const last = useRef<{ el: Field; start: number; end: number } | null>(null);
  const pausedRef = useRef(false);
  /** a text field had focus when the iframe lost it (activeElement is reset to <body> by then) */
  const fieldActive = useRef(false);
  const pausedAt = useRef(0);
  const [paused, setPaused] = useState(false);
  /** bar sits right under the paused field (a tall embed's bottom edge may be off-screen in Notion) */
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!paused) return;
    const place = () => {
      const el = last.current?.el;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const left = Math.max(8, Math.min(r.left, window.innerWidth - 260));
      const below = r.bottom + 8;
      setPos({ top: below + 44 > window.innerHeight ? Math.max(8, r.top - 52) : below, left });
    };
    place();
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [paused]);

  useEffect(() => {
    const remember = (el: Field) => {
      last.current = { el, start: el.selectionStart ?? el.value.length, end: el.selectionEnd ?? el.value.length };
    };
    const setP = (v: boolean) => {
      if (v && !pausedRef.current) pausedAt.current = Date.now();
      pausedRef.current = v;
      setPaused(v);
      last.current?.el.toggleAttribute('data-nb-paused', v);
    };

    const restore = () => {
      const l = last.current;
      if (!l || !l.el.isConnected || l.el.disabled || l.el.readOnly) {
        setP(false);
        return;
      }
      l.el.focus({ preventScroll: true });
      try {
        const len = l.el.value.length;
        l.el.setSelectionRange(Math.min(l.start, len), Math.min(l.end, len));
      } catch {
        /* some input types don't support selection */
      }
      // the browser may refuse focus without a user gesture — keep the bar then
      requestAnimationFrame(() => {
        if (document.hasFocus() && document.activeElement === l.el) setP(false);
      });
    };

    const onFocusIn = (e: FocusEvent) => {
      fieldActive.current = isField(e.target);
      if (isField(e.target)) {
        if (last.current && last.current.el !== e.target) last.current.el.removeAttribute('data-nb-paused');
        remember(e.target);
        setP(false);
      }
    };
    const onFocusOut = (e: FocusEvent) => {
      if (!isField(e.target)) return;
      remember(e.target);
      // focus moved inside the exercise (another button/field) → not a «lost to Notion» case
      window.setTimeout(() => {
        if (document.hasFocus()) fieldActive.current = isField(document.activeElement);
      }, 0);
    };
    const onCaret = (e: Event) => {
      if (isField(e.target) && e.target === document.activeElement) remember(e.target);
    };
    // the iframe as a whole lost focus (Notion grabbed it) while the student was in a field
    const onWindowBlur = () => {
      const l = last.current;
      if (l && (fieldActive.current || document.activeElement === l.el)) setP(true);
    };
    const onWindowFocus = () => {
      if (!pausedRef.current) return;
      // focus came back with a click on empty space → put the caret back in the field
      window.setTimeout(() => {
        const a = document.activeElement;
        if (!a || a === document.body || !(a instanceof HTMLElement) || a.closest('[data-nb-paused]')) restore();
        else setP(false);
      }, 0);
    };
    // auto-return only shortly after the pause: someone who has been working in the Notion page
    // for a while (the teacher editing it) must not lose focus just by moving the mouse over
    const onPointerBack = () => {
      if (pausedRef.current && Date.now() - pausedAt.current < 60_000) restore();
    };
    const onPointerDown = (e: PointerEvent) => {
      if (!pausedRef.current) return;
      const t = e.target as HTMLElement | null;
      // a click on another control is the student's choice — don't hijack it
      if (t && t.closest('button, a, input, textarea, select, label, [role="tab"]') && !t.closest('.nb-paused-bar')) {
        setP(false);
        return;
      }
      window.setTimeout(restore, 0);
    };

    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    document.addEventListener('keyup', onCaret, true);
    document.addEventListener('mouseup', onCaret, true);
    document.addEventListener('input', onCaret, true);
    document.addEventListener('pointerover', onPointerBack);
    document.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('blur', onWindowBlur);
    window.addEventListener('focus', onWindowFocus);
    return () => {
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
      document.removeEventListener('keyup', onCaret, true);
      document.removeEventListener('mouseup', onCaret, true);
      document.removeEventListener('input', onCaret, true);
      document.removeEventListener('pointerover', onPointerBack);
      document.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('blur', onWindowBlur);
      window.removeEventListener('focus', onWindowFocus);
    };
  }, []);

  if (!paused) return null;
  return (
    <button
      type="button"
      className="nb-paused-bar"
      style={pos ? { top: pos.top, left: pos.left } : undefined}
      onClick={() => {
        const l = last.current;
        if (!l) return;
        l.el.focus({ preventScroll: true });
        try {
          l.el.setSelectionRange(l.start, l.end);
        } catch {
          /* ignore */
        }
        l.el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }}
    >
      <MousePointerClick aria-hidden />
      Kliknij, żeby pisać dalej
    </button>
  );
}
