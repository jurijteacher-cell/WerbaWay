'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import 'rrweb/dist/style.css';
import Link from 'next/link';
import { useT } from '@/i18n/client';
import { isLessonPath, lessonSlugOf, pickStudent, type ClassMsg, type Presence, type ViewAnchor } from '@/lib/live/protocol';
import { useLiveChannel } from './useLiveChannel';
import { MarkLessonDone } from './MarkLessonDone';

type Rep = {
  addEvent: (e: unknown) => void;
  startLive: () => void;
  destroy?: () => void;
  on: (ev: string, cb: (p: { width: number; height: number }) => void) => void;
  wrapper: HTMLElement;
  iframe?: HTMLIFrameElement;
  getMirror?: () => { getNode: (id: number) => Node | null };
};

type RREvent = { type: number; timestamp: number; data?: { source?: number; id?: number; x?: number; y?: number; initialOffset?: { top: number; left: number } } };

/** `desk` — кадр по вікну викладача; `mirror` — точно екран учня. */
type ViewMode = 'desk' | 'mirror';
const MODE_KEY = 'ww.live.viewMode';

/**
 * Викладач дивиться екран наживо — рівно те, що бачить учень. Лише перегляд: кліки й клавіші
 * сюди не доходять, учневі нічого не надсилається, крім прохання про свіжий знімок.
 * `topic` — classTopic(uid) для учня з акаунтом або guestTopic(vid) для гостя за посиланням;
 * `studentId` є лише в учня з акаунтом (кнопка «Пройдено, задати домашку»).
 */
export function LiveWatch({ topic, name, studentId }: { topic: string; name: string; studentId?: string }) {
  const t = useT();
  const [student, setStudent] = useState<Presence | null>(null);
  const [hasFrame, setHasFrame] = useState(false);
  const [mode, setMode] = useState<ViewMode>('desk');
  const modeRef = useRef<ViewMode>('desk');
  const stageRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const repRef = useRef<Rep | null>(null);
  const viewport = useRef({ w: 1280, h: 800 });
  const gotFrame = useRef(false);
  const sendRef = useRef<(m: ClassMsg) => Promise<boolean>>(() => Promise.resolve(false));
  /** що посередині екрана учня (для `desk`) і його піксельна прокрутка сторінки (для `mirror`) */
  const anchorRef = useRef<ViewAnchor | null>(null);
  const docScroll = useRef({ x: 0, y: 0 });

  /**
   * Прокрутка кадру. `mirror` — пікселі учня як є. `desk` — кадр розкладений під ширину викладача,
   * пікселі учня тут показали б інше місце (у вузькому вікні — лише обкладинку), тому ставимо
   * в центр кадру той самий фрагмент лекції, що посередині екрана в учня.
   */
  const syncScroll = useCallback(() => {
    const rep = repRef.current;
    const win = rep?.iframe?.contentWindow;
    if (!rep || !win) return;
    let top: number;
    let left = 0;
    const a = anchorRef.current;
    const node = a && modeRef.current === 'desk' ? rep.getMirror?.().getNode(a.id) : null;
    if (!a || !node || node.nodeType !== 1) {
      // `mirror`, або якоря ще нема (вузол не доїхав) — пікселі учня
      top = docScroll.current.y;
      left = docScroll.current.x;
    } else {
      const r = (node as Element).getBoundingClientRect();
      top = Math.max(0, Math.round(win.scrollY + r.top + a.r * r.height - win.innerHeight / 2));
    }
    if (Math.abs(win.scrollY - top) < 2 && Math.abs(win.scrollX - left) < 2) return;
    win.scrollTo({ top, left, behavior: 'instant' as ScrollBehavior });
  }, []);

  /**
   * Два режими кадру:
   *  `desk`   — ширину й висоту кадру задає вікно викладача. Media queries живуть усередині
   *             кадру й перераховуються під цю ширину, тож мобільна колонка учня розкладається
   *             так, як на ноуті (гілок на JS у лекціях немає — лейаут суто на CSS).
   *  `mirror` — рівно те, що бачить учень, збільшене так, щоб його екран влазив цілком.
   */
  const fit = useCallback(() => {
    const stage = stageRef.current;
    const mount = mountRef.current;
    const rep = repRef.current;
    if (!stage || !mount || !rep) return;
    const W = Math.max(320, Math.round(stage.clientWidth));
    const H = Math.max(520, Math.round(window.innerHeight - stage.getBoundingClientRect().top - 24));
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
      syncScroll();
      return;
    }
    const vp = viewport.current;
    const k = Math.min(W / vp.w, H / vp.h);
    box(vp.w, vp.h);
    rep.wrapper.style.transform = `scale(${k})`;
    rep.wrapper.style.transformOrigin = 'top left';
    mount.style.width = `${Math.round(vp.w * k)}px`;
    mount.style.height = `${Math.round(vp.h * k)}px`;
    syncScroll();
  }, [syncScroll]);

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
    },
    [fit]
  );

  const resetReplayer = useCallback(
    async (rrweb: typeof import('rrweb')) => {
      const mount = mountRef.current;
      if (!mount) return;
      repRef.current?.destroy?.();
      mount.innerHTML = '';
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
      rep.startLive();
      repRef.current = rep;
      fit(); // новий програвач приходить із розміром учня — одразу приводимо до вибраного режиму
    },
    [fit]
  );

  // пакети застосовуємо строго по черзі: знімок перебудовує програвач
  const queue = useRef<Promise<void>>(Promise.resolve());
  const mods = useRef<Promise<[typeof import('rrweb'), typeof import('@rrweb/packer')]> | null>(null);
  const onRR = useCallback(
    (packed: string[]) => {
      queue.current = queue.current
        .then(async () => {
          mods.current ??= Promise.all([import('rrweb'), import('@rrweb/packer')]);
          const [rrweb, { unpack }] = await mods.current;
          let ts = Date.now();
          for (const p of packed) {
            const ev = unpack(p) as unknown as RREvent;
            if (ev.type === 4) await resetReplayer(rrweb); // новий документ → новий програвач
            ev.timestamp = ts++; // годинники учня й викладача різні
            if (ev.type === 2 && ev.data?.initialOffset) {
              docScroll.current = { x: ev.data.initialOffset.left, y: ev.data.initialOffset.top };
            }
            // прокрутка всієї сторінки учня: запам'ятовуємо, а застосовуємо самі (syncScroll) —
            // у `desk` вона б перебивала прокрутку за якорем
            if (ev.type === 3 && ev.data?.source === 3 && typeof ev.data.id === 'number') {
              const node = repRef.current?.getMirror?.().getNode(ev.data.id);
              if (node && node.nodeType === 9) {
                docScroll.current = { x: ev.data.x ?? 0, y: ev.data.y ?? 0 };
                continue;
              }
            }
            repRef.current?.addEvent(ev);
            if (ev.type === 2 && !gotFrame.current) {
              gotFrame.current = true;
              setHasFrame(true);
            }
          }
          fit();
        })
        .catch(() => undefined);
    },
    [resetReplayer, fit]
  );

  const expectSeq = useRef(0);
  const lastAsk = useRef(0);
  const askSnap = useCallback(() => {
    const now = Date.now();
    if (now - lastAsk.current < 1500) return;
    lastAsk.current = now;
    void sendRef.current({ k: 'need-snap' });
  }, []);

  const { link, send } = useLiveChannel({
    topic,
    presence: () => ({ role: 'teacher', mode: 'watch', at: Date.now() }),
    onMessage: (m) => {
      if (m.k === 'vp') {
        // у ту саму чергу, що й запис: вузол якоря міг прийти в пакеті, який ще застосовується
        queue.current = queue.current.then(() => {
          anchorRef.current = m;
          syncScroll();
        });
        return;
      }
      if (m.k !== 'rr') return;
      // пакет загубився — далі картинка була б застарілою, тому просимо свіжий знімок
      if (typeof m.n === 'number') {
        if (expectSeq.current && m.n !== expectSeq.current && m.n !== 1) askSnap();
        expectSeq.current = m.n + 1;
      }
      onRR(m.d);
    },
    onPresence: (all) => {
      const s = pickStudent(all);
      setStudent(s);
      if (!s || s.mode !== 'lesson') {
        gotFrame.current = false;
        setHasFrame(false);
        expectSeq.current = 0;
      }
    },
  });
  sendRef.current = send;

  const inLesson = !!student && student.mode === 'lesson' && isLessonPath(student.path);

  // просимо картинку, доки не прийде (учень міг почати запис раніше, ніж ми підключились)
  useEffect(() => {
    if (!inLesson || hasFrame) return;
    void send({ k: 'need-snap' });
    const id = setInterval(() => void send({ k: 'need-snap' }), 3000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inLesson, hasFrame, link]);

  // картинки й шрифти в кадрі довантажуються й зсувають лейаут — підрівнюємо прокрутку
  useEffect(() => {
    if (!hasFrame) return;
    const id = setInterval(syncScroll, 700);
    return () => clearInterval(id);
  }, [hasFrame, syncScroll]);

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
        {slug && studentId && (
          <>
            <Link href={`/learn/${slug}`} className="ww-btn ww-btn-ghost" target="_blank">
              {t("Відкрити лекцію ↗")}
            </Link>
            <MarkLessonDone studentId={studentId} lessons={[{ slug, title: student?.title || slug }]} compact />
          </>
        )}
      </div>
      <div ref={stageRef} className="ww-live-stage">
        {status && <p className="ww-live-status">{status}</p>}
        <div ref={mountRef} className="ww-live-mount" style={{ display: hasFrame && inLesson ? undefined : 'none' }} />
      </div>
    </div>
  );
}
