'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useT } from '@/i18n/client';
import { classTopic, guestTopic, isLessonPath, toWire, type ClassMsg, type Presence, type ViewAnchor } from '@/lib/live/protocol';
import { useLiveChannel } from './useLiveChannel';

type Recorder = typeof import('rrweb').record;
type IdMirror = { getId: (n: Node) => number };

/**
 * Елемент посередині екрана учня (у колонці лекції) і де в ньому центр екрана, 0…1.
 * id — той самий, під яким вузол іде в запис rrweb, тож у викладача він знаходиться напряму.
 */
function viewAnchor(record: Recorder | undefined): ViewAnchor | null {
  const mirror = (record as unknown as { mirror?: IdMirror } | undefined)?.mirror;
  if (!mirror?.getId) return null;
  const cy = window.innerHeight / 2;
  const main = document.querySelector('main')?.getBoundingClientRect();
  const xs = main && main.width > 0
    ? [0.5, 0.35, 0.65, 0.2, 0.8].map((f) => main.left + main.width * f)
    : [window.innerWidth / 2];
  const root = document.documentElement;
  for (const x of xs) {
    let el = document.elementFromPoint(x, cy);
    while (el && el !== root && el !== document.body && !(mirror.getId(el) > 0)) el = el.parentElement;
    if (!el || el === root || el === document.body) continue;
    const r = el.getBoundingClientRect();
    if (r.height < 1) continue;
    return { k: 'vp', id: mirror.getId(el), r: Math.round(Math.min(1, Math.max(0, (cy - r.top) / r.height)) * 1000) / 1000 };
  }
  return null;
}

/**
 * Маячок працює лише у вікні верхнього рівня. Вправи в лекції — це iframe з того самого сайту,
 * і кожен з них рендерить шапку (схована CSS) разом із маячком: виходило по з'єднанню на кожну
 * вправу з присутністю «на сайті» (/embed/…), а паралельні оновлення токена в цих вікнах обривали
 * канал самої лекції — і викладач бачив «на сайті» замість «у лекції».
 */
function Beacon({ topic, name }: { topic: string; name?: string }) {
  const pathname = usePathname();
  const [topLevel, setTopLevel] = useState(false);
  useEffect(() => {
    try {
      setTopLevel(window.self === window.top);
    } catch {
      setTopLevel(false); // доступу до top немає — значить, ми в чужому iframe
    }
  }, []);
  if (!topLevel || /^\/(embed|slides)(\/|$)/.test(pathname ?? '')) return null;
  return <BeaconInner topic={topic} name={name} />;
}

/** Учень з акаунтом: канал class:<uid> */
export function LiveBeacon({ studentId, name }: { studentId: string; name?: string }) {
  return <Beacon topic={classTopic(studentId)} name={name} />;
}

/** Гість за публічним посиланням: канал guest:<vid> (акаунта ще немає) */
export function GuestBeacon({ visitorId, name }: { visitorId: string; name?: string }) {
  return <Beacon topic={guestTopic(visitorId)} name={name} />;
}

/** знімок екрана — не частіше, ніж раз на стільки, і ніколи, поки попередній ще відправляється */
const SNAP_GAP_MS = 4000;

/**
 * Учень на сайті: тримає присутність на своєму каналі (онлайн, яка лекція відкрита, чи вкладка
 * перед очима), а коли викладач відкрив «Дивитися» саме цю вкладку і учень у лекції — пише екран
 * (rrweb) і шле викладачеві. Учень бачить маленьку позначку «Викладач дивиться». Нічого не
 * блокує й не перехоплює.
 */
function BeaconInner({ topic, name }: { topic: string; name?: string }) {
  const t = useT();
  const pathname = usePathname();
  const [watched, setWatched] = useState(false);
  const pathRef = useRef(pathname);
  pathRef.current = pathname;
  const titleRef = useRef<string | undefined>(undefined);
  // id цієї вкладки: у учня бувають відкриті дві лекції (чи лекція й домашка) — пише лише та,
  // яку дивиться викладач, інакше два потоки змішувались і картинка стрибала між ними
  const tabRef = useRef('');
  if (!tabRef.current) tabRef.current = Math.random().toString(36).slice(2, 10);
  const visRef = useRef(true);

  const presence = (): Presence => ({
    role: 'student',
    name,
    mode: isLessonPath(pathRef.current) ? 'lesson' : 'site',
    path: pathRef.current ?? undefined,
    title: titleRef.current,
    tab: tabRef.current,
    vis: visRef.current,
    at: Date.now(),
  });

  const recRef = useRef<{ record: Recorder } | null>(null);
  /** попросити свіжий знімок (знімки зливаються: див. requestSnap у записі) */
  const snapRef = useRef<() => void>(() => undefined);
  const sendRef = useRef<(m: ClassMsg) => Promise<boolean>>(() => Promise.resolve(false));

  const { send, track, link } = useLiveChannel({
    topic,
    presence,
    onMessage: (m) => {
      if (m.k === 'need-snap' && (!m.to || m.to === tabRef.current)) snapRef.current();
    },
    onPresence: (all) =>
      setWatched(
        all.some((p) => p.role === 'teacher' && p.mode === 'watch' && (!p.watch || p.watch === tabRef.current))
      ),
  });
  sendRef.current = send;

  // назва лекції — з її заголовка (з'являється після рендера); присутність — при кожній зміні сторінки
  useEffect(() => {
    titleRef.current = undefined;
    const id = setTimeout(() => {
      titleRef.current = isLessonPath(pathname) ? document.querySelector('main h1')?.textContent?.trim() || undefined : undefined;
      track(presence());
    }, 600);
    track(presence());
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, link]);

  // вкладка перед очима чи схована — викладач іде за тією, на яку учень зараз дивиться
  useEffect(() => {
    const on = () => {
      visRef.current = document.visibilityState !== 'hidden';
      track(presence());
    };
    on();
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [link]);

  const active = watched && isLessonPath(pathname);

  // запис екрана: лише поки active
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let buf: string[] = [];
    let timer: ReturnType<typeof setTimeout> | null = null;
    let inFlight = false;
    let seq = 0;
    // знімки (повна копія сторінки з усіма вправами — це сотні КБ, інколи мегабайти):
    //  · поки один у буфері чи відправляється, нового не робимо — прохання лише запам'ятовуємо;
    //  · не частіше, ніж раз на SNAP_GAP_MS. Раніше кожне прохання викладача (раз на 3 с, поки
    //    картинки нема) робило новий знімок, а відправка тривала довше — черга росла, сторінка
    //    учня гальмувала, і все зависало.
    let snapInBuf = false;
    let snapBusy = false;
    let lastSnap = 0;
    let wantSnap = false;
    let snapTimer: ReturnType<typeof setTimeout> | null = null;
    let record: Recorder | null = null;
    let stopRec: (() => void) | undefined;

    const trySnap = () => {
      if (!wantSnap || cancelled || !record || snapBusy) return;
      const wait = lastSnap + SNAP_GAP_MS - Date.now();
      if (wait > 0) {
        snapTimer ??= setTimeout(() => {
          snapTimer = null;
          trySnap();
        }, wait);
        return;
      }
      wantSnap = false;
      record.takeFullSnapshot(true);
    };
    snapRef.current = () => {
      wantSnap = true;
      trySnap();
    };

    // події відправляємо майже одразу, наступну порцію — щойно попередня пішла
    const flush = () => {
      timer = null;
      if (!buf.length) return;
      if (inFlight) {
        timer = setTimeout(flush, 60);
        return;
      }
      const batch = buf;
      const hadSnap = snapInBuf;
      buf = [];
      snapInBuf = false;
      inFlight = true;
      void sendRef.current({ k: 'rr', d: batch, n: ++seq, t: tabRef.current, e: 'b64' }).finally(() => {
        inFlight = false;
        if (hadSnap) {
          snapBusy = false;
          trySnap(); // поки цей ішов, викладач міг попросити ще
        }
        if (buf.length && !timer) timer = setTimeout(flush, 0);
      });
    };

    (async () => {
      const [rr, { pack }] = await Promise.all([import('rrweb'), import('@rrweb/packer')]);
      if (cancelled) return;
      const stop = rr.record({
        emit: (e) => {
          if ((e as { type: number }).type === 4) {
            // Meta — початок нового знімка: усе, що не встигло піти до нього, вже не потрібне — викладач перебудує кадр
            buf = [];
            snapInBuf = true;
            snapBusy = true;
            lastSnap = Date.now();
          }
          buf.push(toWire(pack(e) as string));
          if (!timer) timer = setTimeout(flush, 40);
        },
        inlineStylesheet: true,
        recordCanvas: false,
        // скрипти, коментарі, службові <meta> викладачеві не потрібні — знімок менший
        slimDOMOptions: 'all',
        // поля паролів rrweb маскує сам; курсор учня викладачеві не потрібен
        sampling: { mousemove: false, scroll: 120, input: 'last' },
      });
      if (!stop) return;
      if (cancelled) {
        stop();
        return;
      }
      record = rr.record;
      recRef.current = { record: rr.record };
      stopRec = stop;
      trySnap(); // прохання, що прийшло, поки rrweb вантажився
    })();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      if (snapTimer) clearTimeout(snapTimer);
      snapRef.current = () => undefined;
      stopRec?.();
      recRef.current = null;
    };
  }, [active]);

  // якір «що посередині екрана» — щоб у режимі «Мій екран» викладач бачив той самий фрагмент
  useEffect(() => {
    if (!active) return;
    let last = '';
    let lastAt = 0;
    const tick = () => {
      const a = viewAnchor(recRef.current?.record);
      if (!a) return;
      const key = `${a.id}:${a.r.toFixed(2)}`;
      const now = Date.now();
      // змінилось — шлемо одразу; ні — раз на 3 с (викладач міг щойно підключитись)
      if (key === last && now - lastAt < 3000) return;
      last = key;
      lastAt = now;
      void sendRef.current({ ...a, t: tabRef.current });
    };
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [active]);

  // учень перегорнув на іншу лекцію чи домашку — свіжий знімок, щоб у викладача не лишилось старе.
  // На старті запису не треба: rrweb сам починає зі знімка.
  const snapPath = useRef<string | null>(null);
  useEffect(() => {
    if (!active) {
      snapPath.current = null;
      return;
    }
    if (snapPath.current === null || snapPath.current === pathname) {
      snapPath.current = pathname;
      return;
    }
    snapPath.current = pathname;
    const id = setTimeout(() => snapRef.current(), 500);
    return () => clearTimeout(id);
  }, [pathname, active]);

  if (!active) return null;
  return (
    <div className="ww-live-badge" role="status">
      <span aria-hidden="true">👁</span> {t("Викладач бачить твій екран")}
    </div>
  );
}
