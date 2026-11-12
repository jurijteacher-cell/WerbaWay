'use client';

import { useEffect } from 'react';
import { FRAME_TAG, elementAtPath, shortText } from '@/lib/class/protocol';

/**
 * Class mode inside an exercise/slides page. Active only when the page is opened by /class
 * (`?class=1`, inside an iframe of the same site). Records the page DOM with rrweb (without mouse
 * movement) and hands every event to the parent; applies the teacher's commands (take a fresh snapshot, click an element).
 * Renders nothing. Outside class mode it does nothing and loads nothing.
 */
/**
 * Вправа лекції живе у своєму iframe усередині сторінки лекції, тому «те, де стоїть курсор»
 * треба шукати крізь вкладені кадри: document.activeElement самої лекції — це сам iframe.
 */
function deepActive(): Element | null {
  let el: Element | null = document.activeElement;
  for (let i = 0; i < 4 && el && el.tagName === 'IFRAME'; i++) {
    let doc: Document | null = null;
    try {
      doc = (el as HTMLIFrameElement).contentDocument;
    } catch {
      return el; // чужий домен — глибше не йдемо
    }
    const inner = doc?.activeElement ?? null;
    if (!inner || inner === doc?.body || inner === doc?.documentElement) return el;
    el = inner;
  }
  return el;
}

/** Поле вводу — перевіряємо за тегом: елемент із вкладеного кадру не є instanceof нашого вікна */
const isField = (el: Element | null | undefined): el is HTMLInputElement | HTMLTextAreaElement =>
  !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA');

/** Набір за учня: пишемо в поле, де стоїть курсор, так, щоб React побачив зміну */
function typeKey(key: string) {
  const el = deepActive();
  // події створюємо у вікні того кадру, де лежить поле, — інакше React там їх не впізнає
  const win = (el?.ownerDocument?.defaultView ?? window) as Window & typeof globalThis;
  if (!isField(el)) {
    (el as HTMLElement | null)?.dispatchEvent(new win.KeyboardEvent('keydown', { key, bubbles: true }));
    return;
  }
  el.dispatchEvent(new win.KeyboardEvent('keydown', { key, bubbles: true }));
  if (key === 'Enter') return; // саму відповідь перевіряє обробник Enter у вправі
  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? start;
  let value = el.value;
  let caret = start;
  if (key === 'Backspace') {
    if (start !== end) value = value.slice(0, start) + value.slice(end);
    else if (start > 0) {
      value = value.slice(0, start - 1) + value.slice(end);
      caret = start - 1;
    } else return;
  } else if ([...key].length === 1) {
    value = value.slice(0, start) + key + value.slice(end);
    caret = start + key.length;
  } else return;
  const proto = el.tagName === 'TEXTAREA' ? win.HTMLTextAreaElement.prototype : win.HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  setter ? setter.call(el, value) : (el.value = value);
  try {
    el.setSelectionRange(caret, caret);
  } catch {
    /* поле без каретки (number тощо) */
  }
  el.dispatchEvent(new win.Event('input', { bubbles: true }));
}

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
    // вікно, у якому викладач востаннє клікнув: туди йдуть прокрутка й набір
    let lastWin: Window | null = null;
    // пульт у викладача: учень лише дивиться. Події самого учня мають isTrusted === true,
    // а те, що надсилає викладач, диспатчиться програмно — тож проходить далі.
    let locked = false;
    const block = (e: Event) => {
      if (!locked || !e.isTrusted) return;
      e.preventDefault();
      e.stopPropagation();
    };
    const EVENTS = ['keydown', 'keypress', 'beforeinput', 'pointerdown', 'mousedown', 'click', 'wheel', 'touchstart'];
    /** вправа живе у вкладеному кадрі — блокувати треба і там */
    const guard = () => {
      const docs: Document[] = [document];
      for (const f of Array.from(document.querySelectorAll('iframe'))) {
        try {
          const d = (f as HTMLIFrameElement).contentDocument;
          if (d) docs.push(d);
        } catch {
          /* чужий домен */
        }
      }
      for (const d of docs) {
        const tagged = d as Document & { __wwLock?: boolean };
        if (!tagged.__wwLock) {
          tagged.__wwLock = true;
          for (const ev of EVENTS) d.addEventListener(ev, block, { capture: true, passive: false });
        }
        d.documentElement?.classList.toggle('ww-locked', locked);
      }
    };
    const guardTimer = setInterval(guard, 500);
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
      if (m.k === 'lock' && typeof m.on === 'boolean') {
        locked = m.on;
        guard();
        if (locked) {
          // прибираємо курсор з поля, щоб учень не дописував з клавіатури
          const a = document.activeElement as HTMLElement | null;
          if (a && a !== document.body) a.blur?.();
        }
      } else if (m.k === 'key' && typeof m.key === 'string') {
        typeKey(m.key);
      } else if (m.k === 'scroll' && typeof m.dy === 'number') {
        // гортаємо той кадр, у якому викладач працює (вправа у вкладеному iframe має власну прокрутку)
        const inner = lastWin;
        const canScroll = (w: Window | null) => {
          if (!w) return false;
          try {
            const d = w.document.scrollingElement;
            return !!d && d.scrollHeight - d.clientHeight > 2;
          } catch {
            return false;
          }
        };
        (canScroll(inner) ? (inner as Window) : window).scrollBy({ top: m.dy, behavior: 'auto' });
      } else if (m.k === 'need-snap') {
        rec.takeFullSnapshot(true);
      } else if (m.k === 'click' && Number.isInteger(m.id)) {
        const fits = (e: Element | null | undefined) =>
          !!e && (!m.tag || e.tagName === m.tag) && (!m.text || shortText(e) === m.text);
        // nodeType, а не instanceof: вузол із кадру вправи належить ІНШОМУ вікну,
        // тож `byId instanceof Element` там завжди false — і клік далі просто не йшов
        const byId = rec.mirror.getNode(m.id) as Node | null;
        let el: Element | null =
          byId && byId.nodeType === 1 ? (byId as Element) : ((byId as ChildNode | null)?.parentElement ?? null);
        if (!fits(el) && Array.isArray(m.path)) el = elementAtPath(document, m.path);
        const good = !!(el && fits(el));
        post({ k: 'hit', ok: good, tag: el?.tagName, deep: !!el && el.ownerDocument !== document, id: good ? m.id : undefined });
        if (el && fits(el)) {
          lastWin = el.ownerDocument?.defaultView ?? null;
          // поле вводу спершу отримує фокус, щоб викладач міг у нього писати (клік фокус не ставить),
          // а разом із ним — і сам вкладений кадр, інакше курсор лишиться в лекції
          if (isField(el)) {
            try {
              (el.ownerDocument?.defaultView?.frameElement as HTMLElement | null)?.focus();
            } catch {
              /* кадр з іншого домену — пропускаємо */
            }
            (el as HTMLInputElement).focus({ preventScroll: true });
          }
          (el as HTMLElement).click();
        }
      }
    };
    window.addEventListener('message', onMessage);

    return () => {
      cancelled = true;
      clearInterval(guardTimer);
      locked = false;
      guard();
      window.removeEventListener('message', onMessage);
      stop?.();
    };
  }, []);

  return null;
}
