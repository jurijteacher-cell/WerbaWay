'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import 'rrweb/dist/style.css';
import Link from 'next/link';
import { useT } from '@/i18n/client';
import { fromWire, isLessonPath, lessonSlugOf, pickStudent, type ClassMsg, type Presence, type ViewAnchor } from '@/lib/live/protocol';
import { useLiveChannel } from './useLiveChannel';
import { MarkLessonDone } from './MarkLessonDone';

type Rep = {
  addEvent: (e: unknown) => void;
  startLive: (baselineTime?: number) => void;
  destroy?: () => void;
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
  /** id вузла-документа сторінки учня у знімку: прокрутка саме його — прокрутка сторінки (а не вправи в iframe) */
  const docId = useRef<number | null>(null);
  /** вкладка учня, яку дивимось (у нього їх може бути кілька); її id іде у присутність викладача */
  const tabRef = useRef<string | undefined>(undefined);

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
      // id вузлів у новому знімку інші — старий якір вказав би не туди (новий прийде за ¼ с)
      anchorRef.current = null;
      docId.current = null;
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
            if (ev.type === 4) await resetReplayer(rrweb); // новий документ → новий програвач
            ev.timestamp = Date.now();
            if (ev.type === 2) {
              docId.current = typeof ev.data?.node?.id === 'number' ? ev.data.node.id : null;
              if (ev.data?.initialOffset) docScroll.current = { x: ev.data.initialOffset.left, y: ev.data.initialOffset.top };
            }
            // прокрутка всієї сторінки учня: запам'ятовуємо, а застосовуємо самі (syncScroll) —
            // у `desk` вона б перебивала прокрутку за якорем. Прокрутка всередині вправ (iframe) — як є.
            if (ev.type === 3 && ev.data?.source === 3 && docId.current !== null && ev.data.id === docId.current) {
              docScroll.current = { x: ev.data.x ?? 0, y: ev.data.y ?? 0 };
              continue;
            }
            if (!repRef.current) continue; // зміни до першого знімка нікуди застосувати — чекаємо знімок
            repRef.current.addEvent(ev);
            if (ev.type === 2 && !gotFrame.current) {
              gotFrame.current = true;
              setHasFrame(true);
            }
          }
          fit();
        })
        .catch(() => askSnap(true));
    },
    [resetReplayer, fit, askSnap]
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
          syncScroll();
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
      <div ref={stageRef} className="ww-live-stage">
        {status && <p className="ww-live-status">{status}</p>}
        <div ref={mountRef} className="ww-live-mount" style={{ display: hasFrame && inLesson ? undefined : 'none' }} />
      </div>
    </div>
  );
}
