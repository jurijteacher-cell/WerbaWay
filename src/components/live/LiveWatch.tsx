'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import 'rrweb/dist/style.css';
import '@/components/lesson/lesson.css';
import Link from 'next/link';
import { useT } from '@/i18n/client';
import type { BookPage } from '@/lib/pages/pages';
import { SheetBody } from '@/components/lesson/LessonBlocks';
import { fromWire, isLessonPath, lessonSlugOf, pickStudent, type ClassMsg, type Presence, type ViewAnchor } from '@/lib/live/protocol';
import { useLiveChannel } from './useLiveChannel';
import { MarkLessonDone } from './MarkLessonDone';

type Rep = {
  addEvent: (e: unknown) => void;
  startLive: (baselineTime?: number) => void;
  destroy?: () => void;
  enableInteract?: () => void;
  on: (ev: string, cb: (p: { width: number; height: number }) => void) => void;
  wrapper: HTMLElement;
  iframe?: HTMLIFrameElement;
  getMirror?: () => { getNode: (id: number) => Node | null };
};

type RREvent = {
  type: number;
  timestamp: number;
  data?: { source?: number; id?: number; x?: number; y?: number; node?: { id?: number }; initialOffset?: { top: number; left: number } };
};

/**
 * Усі події застосовуємо одразу й строго в порядку надходження («синхронно»): базовий час
 * програвача — у далекому майбутньому, тож кожна подія для rrweb «вже минула».
 * Раніше події йшли через таймер rrweb за мітками часу ts++ — великий пакет «залазив у майбутнє»,
 * наступний пакет вклинювався всередину нього, зміни сторінки застосовувались не в тому порядку,
 * і картинка розходилась з екраном учня до перезавантаження. До того ж таймер rrweb працює на
 * requestAnimationFrame і стоїть, поки вкладка викладача схована.
 */
const SYNC_BASELINE = Number.MAX_SAFE_INTEGER;
/** поки картинки нема — просимо знімок не частіше, ніж раз на стільки (і не поки знімок ще йде) */
const ASK_EVERY_MS = 4000;
/** самовідновлення: навіть без видимих збоїв раз на стільки беремо свіжий знімок */
const HEAL_EVERY_MS = 120_000;
const INSTANT = 'instant' as ScrollBehavior;

/** `desk` — кадр по вікну викладача; `mirror` — точно екран учня. */
type ViewMode = 'desk' | 'mirror';
const MODE_KEY = 'ww.live.viewMode';

/** що показує сцена: `student` — екран учня наживо; число — сторінка лекції, яку викладач відкрив сам */
type View = 'student' | number;

/** прокрутка кадру викладача: сторінка і кожне вікно вправи (у порядку на сторінці) */
type ScrollState = { x: number; y: number; nested: { x: number; y: number }[]; folio: string | null };

/** «3 / 12» з поточного аркуша блокнота учня (у домашці аркушів нема — null) */
const readFolio = (doc: Document | null | undefined) =>
  doc?.querySelector('.lp-sheet.is-current .lp-sheet-folio')?.textContent?.replace(/\s+/g, ' ').trim() || null;

/** документ і всі вкладені вікна вправ у кадрі */
function eachDoc(doc: Document | null | undefined, fn: (d: Document) => void, depth = 0) {
  if (!doc || depth > 3) return;
  fn(doc);
  doc.querySelectorAll('iframe').forEach((f) => {
    try {
      eachDoc(f.contentDocument, fn, depth + 1);
    } catch {
      /* чужий кадр (YouTube) — не наш */
    }
  });
}

/**
 * Викладач дивиться екран учня наживо, але гортає й вибирає вправу сам: прокрутка учня кадр
 * більше не тягне, а клік по «Далі», «Назад» чи списку сторінок у кадрі відкриває викладачеві
 * ту сторінку (у вікні учня нічого не відбувається — туди не йде жоден клік).
 * Кнопка «До учня» повертає туди, де учень зараз.
 * `topic` — classTopic(uid) для учня з акаунтом або guestTopic(vid) для гостя за посиланням;
 * `studentId` є лише в учня з акаунтом (кнопка «Пройдено, задати домашку»).
 */
export function LiveWatch({ topic, name, studentId }: { topic: string; name: string; studentId?: string }) {
  const t = useT();
  const [student, setStudent] = useState<Presence | null>(null);
  const [hasFrame, setHasFrame] = useState(false);
  const [mode, setMode] = useState<ViewMode>('desk');
  const modeRef = useRef<ViewMode>('desk');
  const [view, setView] = useState<View>('student');
  const viewRef = useRef<View>('student');
  const [lesson, setLesson] = useState<{ path: string; title: string; pages: BookPage[] } | null>(null);
  const [studentIdx, setStudentIdx] = useState<number | null>(null);
  const studentIdxRef = useRef<number | null>(null);
  const [stageH, setStageH] = useState<number | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const repRef = useRef<Rep | null>(null);
  const viewport = useRef({ w: 1280, h: 800 });
  const gotFrame = useRef(false);
  const sendRef = useRef<(m: ClassMsg) => Promise<boolean>>(() => Promise.resolve(false));
  /** де учень: що посередині його екрана (для `desk`), піксельна прокрутка сторінки (для `mirror`) і вікон вправ */
  const anchorRef = useRef<ViewAnchor | null>(null);
  const docScroll = useRef({ x: 0, y: 0 });
  const innerScroll = useRef(new Map<number, { x: number; y: number }>());
  /** id вузла-документа сторінки учня у знімку: прокрутка саме його — прокрутка сторінки (а не вправи в iframe) */
  const docId = useRef<number | null>(null);
  /** вкладка учня, яку дивимось (у нього їх може бути кілька); її id іде у присутність викладача */
  const tabRef = useRef<string | undefined>(undefined);
  /** прокрутка викладача перед перезнімком / перед переходом на свою сторінку — щоб повернути її */
  const pendingRestore = useRef<ScrollState | null>(null);
  const hiddenScroll = useRef<ScrollState | null>(null);
  const jumpOnShow = useRef(false);
  const restoreGen = useRef(0);
  const folioRef = useRef<string | null>(null);

  const frameWin = () => repRef.current?.iframe?.contentWindow ?? null;
  const frameDoc = () => repRef.current?.iframe?.contentDocument ?? null;

  const captureScroll = useCallback((): ScrollState | null => {
    const win = frameWin();
    const doc = frameDoc();
    if (!win || !doc) return null;
    const nested = Array.from(doc.querySelectorAll('iframe')).map((f) => {
      try {
        const w = f.contentWindow;
        return w ? { x: w.scrollX, y: w.scrollY } : { x: 0, y: 0 };
      } catch {
        return { x: 0, y: 0 };
      }
    });
    return { x: win.scrollX, y: win.scrollY, nested, folio: readFolio(doc) };
  }, []);

  /** на початок аркуша, якщо викладач нижче (учень перегорнув — старе місце вже нічого не означає) */
  const toBookTop = useCallback(() => {
    const win = frameWin();
    const book = frameDoc()?.querySelector('.lp-book');
    if (!win || !book) return;
    const top = book.getBoundingClientRect().top;
    if (top < 0) win.scrollTo({ top: Math.max(0, win.scrollY + top - 16), left: 0, behavior: INSTANT });
  }, []);

  const restoreScroll = useCallback(
    (s: ScrollState) => {
      const win = frameWin();
      const doc = frameDoc();
      if (!win || !doc) return;
      const now = readFolio(doc);
      if (s.folio && now && now !== s.folio) {
        toBookTop();
        return;
      }
      win.scrollTo({ left: s.x, top: s.y, behavior: INSTANT });
      doc.querySelectorAll('iframe').forEach((f, i) => {
        const p = s.nested[i];
        try {
          if (p) f.contentWindow?.scrollTo({ left: p.x, top: p.y, behavior: INSTANT });
        } catch {
          /* чужий кадр */
        }
      });
    },
    [toBookTop]
  );

  /** картинки, шрифти й вікна вправ довантажуються й зсувають лейаут — повторюємо ще двічі */
  const scheduleRestore = useCallback(
    (s: ScrollState) => {
      const gen = ++restoreGen.current;
      restoreScroll(s);
      for (const ms of [250, 900]) setTimeout(() => gen === restoreGen.current && restoreScroll(s), ms);
    },
    [restoreScroll]
  );

  /**
   * Кадр — туди, де зараз учень. `mirror` — пікселі учня як є. `desk` — кадр розкладений під ширину
   * викладача, пікселі учня тут показали б інше місце, тому ставимо в центр кадру той самий
   * фрагмент лекції, що посередині екрана в учня. Вікна вправ — за прокруткою учня всередині них.
   */
  const jumpToStudent = useCallback(() => {
    const rep = repRef.current;
    const win = frameWin();
    if (!rep || !win) return;
    restoreGen.current++; // відкладені повернення старої прокрутки вже не потрібні
    const mirror = rep.getMirror?.();
    let top = docScroll.current.y;
    let left = docScroll.current.x;
    const a = anchorRef.current;
    const node = a && modeRef.current === 'desk' ? mirror?.getNode(a.id) : null;
    if (a && node && node.nodeType === 1) {
      const r = (node as Element).getBoundingClientRect();
      top = Math.max(0, Math.round(win.scrollY + r.top + a.r * r.height - win.innerHeight / 2));
      left = 0;
    }
    win.scrollTo({ top, left, behavior: INSTANT });
    for (const [id, p] of innerScroll.current) {
      const n = mirror?.getNode(id);
      if (!n) continue;
      try {
        if (n.nodeType === 9) (n as Document).defaultView?.scrollTo({ top: p.y, left: p.x, behavior: INSTANT });
        else if (n.nodeType === 1) {
          (n as Element).scrollTop = p.y;
          (n as Element).scrollLeft = p.x;
        }
      } catch {
        /* вузол уже зник */
      }
    }
  }, []);

  /**
   * Два режими кадру:
   *  `desk`   — ширину й висоту кадру задає вікно викладача. Media queries живуть усередині
   *             кадру й перераховуються під цю ширину, тож мобільна колонка учня розкладається
   *             так, як на ноуті (гілок на JS у лекціях немає — лейаут суто на CSS).
   *  `mirror` — рівно те, що бачить учень, збільшене так, щоб його екран влазив цілком.
   * Прокрутку кадру тут не чіпаємо — її веде сам викладач.
   */
  const fit = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const W = Math.max(320, Math.round(stage.clientWidth));
    const H = Math.max(520, Math.round(window.innerHeight - stage.getBoundingClientRect().top - 24));
    setStageH((h) => (h === H ? h : H));
    const mount = mountRef.current;
    const rep = repRef.current;
    if (!mount || !rep) return;
    // rrweb ставить кадру scrolling="no" і pointer-events: none — викладач гортає сам
    rep.enableInteract?.();
    if (rep.iframe) {
      rep.iframe.style.pointerEvents = 'auto';
      rep.iframe.setAttribute('scrolling', 'auto');
    }
    const box = (w: number, h: number) => {
      if (rep.iframe) {
        rep.iframe.style.width = `${w}px`;
        rep.iframe.style.height = `${h}px`;
      }
      rep.wrapper.style.width = `${w}px`;
      rep.wrapper.style.height = `${h}px`;
    };
    if (modeRef.current === 'desk') {
      box(W, H);
      rep.wrapper.style.transform = 'none';
      mount.style.width = `${W}px`;
      mount.style.height = `${H}px`;
      return;
    }
    const vp = viewport.current;
    const k = Math.min(W / vp.w, H / vp.h);
    box(vp.w, vp.h);
    rep.wrapper.style.transform = `scale(${k})`;
    rep.wrapper.style.transformOrigin = 'top left';
    mount.style.width = `${Math.round(vp.w * k)}px`;
    mount.style.height = `${Math.round(vp.h * k)}px`;
  }, []);

  // вибір режиму тримається між сесіями
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(MODE_KEY);
    } catch {
      saved = null; // приватний режим — лишаємо типовий
    }
    if (saved === 'desk' || saved === 'mirror') {
      modeRef.current = saved;
      setMode(saved);
    }
  }, []);

  const switchMode = useCallback(
    (m: ViewMode) => {
      modeRef.current = m;
      setMode(m);
      try {
        localStorage.setItem(MODE_KEY, m);
      } catch {
        /* не критично */
      }
      fit();
      jumpToStudent(); // інший лейаут — старі пікселі показали б не те місце
    },
    [fit, jumpToStudent]
  );

  /* ── що показує сцена: екран учня чи сторінку, яку викладач відкрив сам ── */

  const show = useCallback(
    (v: View) => {
      const pages = lesson?.pages.length ?? 0;
      if (typeof v === 'number') {
        if (v < 0 || v >= pages) return;
        if (v === studentIdxRef.current) v = 'student'; // учень саме там — показуємо наживо, з його відповідями
      }
      if (v === viewRef.current) return;
      if (viewRef.current === 'student') hiddenScroll.current = captureScroll();
      viewRef.current = v;
      setView(v);
    },
    [lesson, captureScroll]
  );
  const showRef = useRef(show);
  showRef.current = show;

  /** ‹ › — від сторінки, яку викладач зараз бачить */
  const shownIdx = () => (viewRef.current === 'student' ? studentIdxRef.current ?? -1 : viewRef.current);
  const step = useCallback((d: number) => showRef.current(shownIdx() + d), []);

  const toStudent = useCallback(() => {
    if (viewRef.current === 'student') {
      jumpToStudent();
      return;
    }
    jumpOnShow.current = true;
    viewRef.current = 'student';
    setView('student');
  }, [jumpToStudent]);

  // повернулись до екрана учня — кадр знову видно: розмір і прокрутка
  useEffect(() => {
    if (view !== 'student') return;
    const id = requestAnimationFrame(() => {
      fit();
      if (jumpOnShow.current) {
        jumpOnShow.current = false;
        jumpToStudent();
      } else if (hiddenScroll.current) scheduleRestore(hiddenScroll.current);
      hiddenScroll.current = null;
    });
    return () => cancelAnimationFrame(id);
  }, [view, fit, jumpToStudent, scheduleRestore]);

  /**
   * Кліки викладача в кадрі: у вікно учня вони й так не йдуть (це копія сторінки без скриптів),
   * але посилання могли б перевести сам кадр деінде. Тому кожен клік гасимо, а «Далі», «Назад»
   * і пункти списку сторінок відкривають викладачеві відповідну сторінку.
   */
  const hooked = useRef(new WeakSet<Element>());
  const hookDocs = useCallback(() => {
    eachDoc(frameDoc(), (d) => {
      const root = d.documentElement;
      if (!root || hooked.current.has(root)) return;
      hooked.current.add(root);
      d.addEventListener(
        'mousedown',
        (e) => {
          // поля вводу не фокусуємо: набране викладачем перебило б картинку
          const el = e.target as Element | null;
          if (el?.closest?.('input,textarea,select,[contenteditable]')) e.preventDefault();
        },
        true
      );
      d.addEventListener(
        'click',
        (e) => {
          e.preventDefault();
          e.stopPropagation();
          const el = e.target as Element | null;
          if (!el?.closest) return;
          const item = el.closest('.lp-pagelist-item');
          if (item) {
            const all = Array.from(item.closest('.lp-pagelist-body')?.querySelectorAll('.lp-pagelist-item') ?? []);
            const i = all.indexOf(item);
            if (i >= 0) showRef.current(i);
            return;
          }
          if (el.closest('.lp-turn-next, .lp-pagebar > button:last-of-type')) step(1);
          else if (el.closest('.lp-turn-prev, .lp-pagebar > button:first-of-type')) step(-1);
        },
        true
      );
    });
  }, [step]);

  /* ── запис учня → кадр ── */

  const resetReplayer = useCallback(
    async (rrweb: typeof import('rrweb')) => {
      const mount = mountRef.current;
      if (!mount) return;
      repRef.current?.destroy?.();
      mount.innerHTML = '';
      // id вузлів у новому знімку інші — старий якір вказав би не туди (новий прийде за ¼ с)
      anchorRef.current = null;
      docId.current = null;
      innerScroll.current.clear();
      const rep = new rrweb.Replayer([], {
        root: mount,
        liveMode: true,
        // Віртуальний DOM rrweb застосовує зміни лише при play(), а в живому режимі play() немає:
        // мутації, що прийшли разом зі знімком (isSync), вмикали віртуальний DOM — і всі наступні
        // зміни осідали в ньому, не доходячи до екрана. Картинка «стояла» на першому кадрі.
        useVirtualDom: false,
        showWarning: false,
        mouseTail: false,
        // анімації появи застигали на першому кадрі з opacity 0 — у перегляді вони не потрібні
        insertStyleRules: ['*,*::before,*::after{animation:none!important;transition:none!important}'],
      }) as unknown as Rep;
      rep.on('resize', ({ width, height }) => {
        viewport.current = { w: width, h: height };
        fit();
      });
      rep.startLive(SYNC_BASELINE);
      repRef.current = rep;
      fit(); // новий програвач приходить із розміром учня — одразу приводимо до вибраного режиму
    },
    [fit]
  );

  const lastAsk = useRef(0);
  /** попросити свіжий знімок у вкладки, яку дивимось; force — без паузи між проханнями */
  const askSnap = useCallback((force = false) => {
    const now = Date.now();
    if (!force && now - lastAsk.current < 3000) return;
    lastAsk.current = now;
    void sendRef.current({ k: 'need-snap', to: tabRef.current });
  }, []);

  // пакети застосовуємо строго по черзі: знімок перебудовує програвач
  const queue = useRef<Promise<void>>(Promise.resolve());
  const mods = useRef<Promise<[typeof import('rrweb'), typeof import('@rrweb/packer')]> | null>(null);
  const onRR = useCallback(
    (packed: string[], enc?: 'b64') => {
      queue.current = queue.current
        .then(async () => {
          mods.current ??= Promise.all([import('rrweb'), import('@rrweb/packer')]);
          const [rrweb, { unpack }] = await mods.current;
          for (const p of packed) {
            let ev: RREvent;
            try {
              ev = unpack(fromWire(p, enc)) as unknown as RREvent;
            } catch {
              // зіпсована подія: без неї наступні зміни лягли б не туди — беремо свіжий знімок
              askSnap(true);
              return;
            }
            if (ev.type === 4) {
              // новий документ → новий програвач; прокрутку викладача переносимо на новий кадр
              if (gotFrame.current) pendingRestore.current = viewRef.current === 'student' ? captureScroll() : null;
              await resetReplayer(rrweb);
            }
            ev.timestamp = Date.now();
            if (ev.type === 2) {
              docId.current = typeof ev.data?.node?.id === 'number' ? ev.data.node.id : null;
              if (ev.data?.initialOffset) docScroll.current = { x: ev.data.initialOffset.left, y: ev.data.initialOffset.top };
            }
            // прокрутку учня не застосовуємо — кадр гортає викладач; лише запам'ятовуємо для «До учня»
            if (ev.type === 3 && ev.data?.source === 3 && typeof ev.data.id === 'number') {
              const pos = { x: ev.data.x ?? 0, y: ev.data.y ?? 0 };
              if (ev.data.id === docId.current) docScroll.current = pos;
              else innerScroll.current.set(ev.data.id, pos);
              continue;
            }
            if (!repRef.current) continue; // зміни до першого знімка нікуди застосувати — чекаємо знімок
            repRef.current.addEvent(ev);
            if (ev.type === 2) {
              const saved = pendingRestore.current;
              pendingRestore.current = null;
              if (saved) scheduleRestore(saved);
              else if (viewRef.current === 'student') {
                // перша картинка — стаємо туди, де учень (якір доїде за мить)
                for (const ms of [300, 1200]) setTimeout(jumpToStudent, ms);
              }
              if (!gotFrame.current) {
                gotFrame.current = true;
                setHasFrame(true);
              }
            }
          }
          fit();
          hookDocs();
        })
        .catch(() => askSnap(true));
    },
    [resetReplayer, fit, askSnap, captureScroll, scheduleRestore, jumpToStudent, hookDocs]
  );

  const expectSeq = useRef(0);

  /** вкладку учня змінено (чи він вийшов з лекції) — кадр старий, чекаємо знімок нової */
  const dropFrame = useCallback(() => {
    gotFrame.current = false;
    setHasFrame(false);
    expectSeq.current = 0;
  }, []);

  // '-' — ще не вибрали вкладку: нові клієнти учня не пишуть, доки не знаємо, яку дивитись
  const presence = (): Presence => ({ role: 'teacher', mode: 'watch', watch: tabRef.current ?? '-', at: Date.now() });
  const { link, send, track, lastRx } = useLiveChannel({
    topic,
    presence,
    onMessage: (m) => {
      if (m.k === 'need-snap') return;
      // потік іншої вкладки учня (не тієї, що дивимось) — пропускаємо, інакше картинки змішуються
      if (m.t && tabRef.current && m.t !== tabRef.current) return;
      if (m.k === 'vp') {
        // у ту саму чергу, що й запис: вузол якоря міг прийти в пакеті, який ще застосовується
        queue.current = queue.current.then(() => {
          anchorRef.current = m;
        });
        return;
      }
      // пакет загубився — далі картинка була б застарілою, тому просимо свіжий знімок
      if (typeof m.n === 'number') {
        if (expectSeq.current && m.n !== expectSeq.current && m.n !== 1) askSnap(true);
        expectSeq.current = m.n + 1;
      }
      onRR(m.d, m.e);
    },
    onPresence: (all) => {
      const s = pickStudent(all);
      setStudent(s);
      const tab = s?.mode === 'lesson' ? s.tab : undefined;
      if (tab !== tabRef.current) {
        tabRef.current = tab;
        dropFrame();
        track(presence()); // скажемо учневі, яку вкладку дивимось — пише лише вона
      } else if (!s || s.mode !== 'lesson') {
        dropFrame();
      }
    },
  });
  sendRef.current = send;

  const inLesson = !!student && student.mode === 'lesson' && isLessonPath(student.path);

  // сторінки лекції учня — щоб викладач міг відкрити будь-яку сам (і з домашки теж)
  const lecturePath = inLesson ? (student?.path ?? '').replace(/\/hw\/?$/, '') : null;
  useEffect(() => {
    if (!lecturePath || lesson?.path === lecturePath) return;
    let off = false;
    fetch(`/api/teacher/live-lesson?path=${encodeURIComponent(lecturePath)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { title?: string; pages?: BookPage[] } | null) => {
        if (off || !d?.pages?.length) return;
        setLesson({ path: lecturePath, title: d.title ?? '', pages: d.pages });
        viewRef.current = 'student';
        setView('student');
      })
      .catch(() => undefined);
    return () => {
      off = true;
    };
  }, [lecturePath, lesson?.path]);

  // просимо картинку, доки не прийде (учень міг почати запис раніше, ніж ми підключились).
  // Поки шматки знімка ще йдуть — не просимо: кожне прохання — це ще один важкий знімок.
  useEffect(() => {
    if (!inLesson || hasFrame || link !== 'online') return;
    askSnap(true);
    const id = setInterval(() => {
      if (Date.now() - lastRx.current > 2500) askSnap(true);
    }, ASK_EVERY_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inLesson, hasFrame, link, student?.tab]);

  // зв'язок відновився — за час обриву могли загубитись зміни: свіжий знімок
  const wasOnline = useRef(false);
  useEffect(() => {
    if (link === 'online' && wasOnline.current && gotFrame.current) askSnap(true);
    if (link === 'online') wasOnline.current = true;
  }, [link, askSnap]);

  // самовідновлення: rrweb мовчки пропускає зміни, які не зміг застосувати (вузла нема) —
  // картинка могла б розійтися з учнем. Раз на 2 хв — свіжий знімок, без перезавантаження сторінки.
  useEffect(() => {
    if (!hasFrame) return;
    const id = setInterval(() => askSnap(true), HEAL_EVERY_MS);
    return () => clearInterval(id);
  }, [hasFrame, askSnap]);

  // на якій сторінці блокнота учень; перегорнув, поки викладач дивиться його екран — на початок аркуша.
  // Заразом чіпляємо кліки до вікон вправ, що з'явились у кадрі.
  useEffect(() => {
    if (!hasFrame) {
      folioRef.current = null;
      studentIdxRef.current = null;
      setStudentIdx(null);
      return;
    }
    const id = setInterval(() => {
      hookDocs();
      const f = readFolio(frameDoc());
      const m = f ? /(\d+)\s*\/\s*(\d+)/.exec(f) : null;
      const idx = m ? Number(m[1]) - 1 : null;
      studentIdxRef.current = idx;
      setStudentIdx(idx);
      if (f && folioRef.current && f !== folioRef.current && viewRef.current === 'student') toBookTop();
      folioRef.current = f;
    }, 500);
    return () => clearInterval(id);
  }, [hasFrame, hookDocs, toBookTop]);

  useEffect(() => {
    const on = () => fit();
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, [fit]);

  const slug = inLesson ? lessonSlugOf(student?.path) : null;
  const status = link !== 'online'
    ? t("Підключаюсь…")
    : !student
      ? t("{name} зараз не на сайті. Щойно учень відкриє лекцію, тут з'явиться його екран.", { name })
      : !inLesson
        ? t("{name} на сайті, але не в лекції. Екран з'явиться, щойно учень відкриє лекцію.", { name })
        : !hasFrame
          ? t("Отримую екран учня…")
          : null;

  const pages = lesson?.pages ?? [];
  const own = typeof view === 'number' ? pages[view] : undefined;
  const cur = typeof view === 'number' ? view : studentIdx ?? -1;
  const label = (p: BookPage) => (p.kind === 'text' || p.kind === 'goal' ? p.section : p.label);
  const groups: { title: string; items: number[] }[] = [];
  pages.forEach((p, i) => {
    const title = p.num ? `${p.num}. ${p.section}` : p.section;
    const g = groups[groups.length - 1];
    if (g && g.title === title) g.items.push(i);
    else groups.push({ title, items: [i] });
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-2 text-sm text-paper-muted">
          <span className={`inline-block h-2.5 w-2.5 rounded-full ${inLesson ? 'bg-correct' : student ? 'bg-gold-fill' : 'bg-paper-muted'}`} />
          {inLesson
            ? t("у лекції: {title}", { title: student?.title || slug || '' })
            : student
              ? t("на сайті")
              : t("не в мережі")}
        </span>
        <span className="flex-1" />
        <span className="inline-flex gap-1">
          <button
            type="button"
            onClick={() => switchMode('desk')}
            aria-pressed={mode === 'desk'}
            className={`ww-btn ww-btn-sm ${mode === 'desk' ? 'ww-btn-accent' : 'ww-btn-ghost'}`}
          >
            {t('Мій екран')}
          </button>
          <button
            type="button"
            onClick={() => switchMode('mirror')}
            aria-pressed={mode === 'mirror'}
            className={`ww-btn ww-btn-sm ${mode === 'mirror' ? 'ww-btn-accent' : 'ww-btn-ghost'}`}
          >
            {t('Як на екрані учня')}
          </button>
        </span>
        <button
          type="button"
          onClick={() => askSnap(true)}
          disabled={!inLesson || link !== 'online'}
          className="ww-btn ww-btn-sm ww-btn-ghost"
          title={t('Якщо картинка відстала від екрана учня')}
        >
          ⟳ {t('Оновити картинку')}
        </button>
        {slug && studentId && (
          <>
            <Link href={`/learn/${slug}`} className="ww-btn ww-btn-ghost" target="_blank">
              {t("Відкрити лекцію ↗")}
            </Link>
            <MarkLessonDone studentId={studentId} lessons={[{ slug, title: student?.title || slug }]} compact />
          </>
        )}
      </div>

      {(pages.length > 0 || (hasFrame && inLesson)) && (
        <div className="ww-live-nav">
          {pages.length > 0 && (
            <>
              <button type="button" className="ww-btn ww-btn-sm ww-btn-ghost" onClick={() => step(-1)} disabled={cur <= 0} aria-label={t('Попередня сторінка')}>
                ‹
              </button>
              <select
                className="ww-live-select"
                value={view === 'student' ? 's' : String(view)}
                onChange={(e) => (e.target.value === 's' ? toStudent() : show(Number(e.target.value)))}
                aria-label={t('Сторінка лекції')}
              >
                <option value="s">
                  👁 {t('Екран учня наживо')}
                  {studentIdx !== null ? ` · ${studentIdx + 1}/${pages.length}` : ''}
                </option>
                {groups.map((g) => (
                  <optgroup key={`${g.title}-${g.items[0]}`} label={g.title}>
                    {g.items.map((i) => (
                      <option key={pages[i].key} value={i}>
                        {i + 1}/{pages.length} · {label(pages[i])}
                        {i === studentIdx ? ' 👁' : ''}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <button
                type="button"
                className="ww-btn ww-btn-sm ww-btn-ghost"
                onClick={() => step(1)}
                disabled={cur >= pages.length - 1}
                aria-label={t('Наступна сторінка')}
              >
                ›
              </button>
            </>
          )}
          <button type="button" className="ww-btn ww-btn-sm ww-btn-accent" onClick={toStudent} disabled={!hasFrame || !inLesson}>
            👁 {t('До учня')}
          </button>
          <span className="ww-live-hint">
            {view === 'student'
              ? t('Гортай і клікай «Далі» чи список сторінок у кадрі — учень лишається, де був.')
              : studentIdx !== null
                ? t('Твій перегляд, без відповідей учня. Учень зараз на сторінці {n}.', { n: studentIdx + 1 })
                : t('Твій перегляд, без відповідей учня.')}
          </span>
        </div>
      )}

      <div ref={stageRef} className="ww-live-stage">
        {view === 'student' && status && <p className="ww-live-status">{status}</p>}
        <div
          ref={mountRef}
          className="ww-live-mount"
          style={{ display: view === 'student' && hasFrame && inLesson ? undefined : 'none' }}
        />
        {own && typeof view === 'number' && (
          <div className="ww-live-own" style={{ height: stageH ? `${stageH}px` : '75vh' }}>
            <div className="lp-root">
              <div className="lp-book">
                <section key={own.key} className="lp-sheet is-current" data-kind={own.kind}>
                  <SheetBody page={own} index={view} total={pages.length} />
                </section>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
