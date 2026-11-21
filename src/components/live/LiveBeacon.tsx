'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useT } from '@/i18n/client';
import { classTopic, guestTopic, isLessonPath, liveKey, type ClassMsg, type Presence } from '@/lib/live/protocol';
import { currentProgressCode, parseProgressKey, readAllProgress } from '@/lib/embed-progress';
import { useLiveChannel } from './useLiveChannel';

/** сторінка лекції з ?p= (1-based; pager тримає його в адресі) — поки подія ww:lesson-page ще не прийшла */
function pageFromUrl(): number | undefined {
  try {
    const p = Number(new URLSearchParams(window.location.search).get('p'));
    return Number.isFinite(p) && p >= 1 ? p - 1 : 0;
  } catch {
    return undefined;
  }
}

/** зміни стану вправ пакуємо й шлемо не частіше, ніж раз на стільки */
const BATCH_MS = 300;

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

/**
 * Учень на сайті: тримає присутність на своєму каналі (онлайн, яка лекція відкрита, на якій
 * вона сторінці, чи вкладка перед очима), а коли викладач відкрив «Дивитися» саме цю вкладку і
 * учень у лекції — шле йому стан вправ (те, що вправи й так пишуть у localStorage, див.
 * lib/embed-progress.ts). Екран не передається. Учень бачить маленьку позначку. Нічого не
 * блокує й не перехоплює.
 */
function BeaconInner({ topic, name }: { topic: string; name?: string }) {
  const t = useT();
  const pathname = usePathname();
  const [watched, setWatched] = useState(false);
  const pathRef = useRef(pathname);
  pathRef.current = pathname;
  const titleRef = useRef<string | undefined>(undefined);
  // id цієї вкладки: у учня бувають відкриті дві лекції (чи лекція й домашка) — шле лише та,
  // яку дивиться викладач
  const tabRef = useRef('');
  if (!tabRef.current) tabRef.current = Math.random().toString(36).slice(2, 10);
  const visRef = useRef(true);
  /** сторінка лекції, на якій учень (з 0); повідомляє LessonPager подією ww:lesson-page */
  const pgRef = useRef<number | undefined>(undefined);

  const presence = (): Presence => ({
    role: 'student',
    name,
    mode: isLessonPath(pathRef.current) ? 'lesson' : 'site',
    path: pathRef.current ?? undefined,
    title: titleRef.current,
    pg: isLessonPath(pathRef.current) ? pgRef.current ?? pageFromUrl() : undefined,
    tab: tabRef.current,
    vis: visRef.current,
    at: Date.now(),
  });

  const sendRef = useRef<(m: ClassMsg) => Promise<boolean>>(() => Promise.resolve(false));
  /** відповідь на прохання викладача: повний стан вікна `key` (виставляє ефект нижче, поки active) */
  const needRef = useRef<(key: string) => void>(() => undefined);

  const { send, track, link } = useLiveChannel({
    topic,
    presence,
    onMessage: (m) => {
      if (m.k === 'need-st' && (!m.to || m.to === tabRef.current)) needRef.current(m.key);
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

  // учень перегорнув сторінку лекції — викладач бачить, де він (кнопка «До учня»)
  useEffect(() => {
    const on = (e: Event) => {
      const n = (e as CustomEvent<number>).detail;
      if (typeof n !== 'number' || n === pgRef.current) return;
      pgRef.current = n;
      track(presence());
    };
    window.addEventListener('ww:lesson-page', on);
    return () => window.removeEventListener('ww:lesson-page', on);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [link]);

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

  // стан вправ: вправи (iframe того ж сайту) пишуть прогрес у localStorage — у цій сторінці
  // це подія `storage`. Шлемо лише змінене, пачкою раз на BATCH_MS; повний стан — на прохання.
  useEffect(() => {
    if (!active) {
      needRef.current = () => undefined;
      return;
    }
    const pending = new Map<string, Record<string, unknown>>();
    let timer: ReturnType<typeof setTimeout> | null = null;

    const flush = () => {
      timer = null;
      for (const [key, s] of pending) void sendRef.current({ k: 'st', key, s });
      pending.clear();
    };

    const onStorage = (e: StorageEvent) => {
      const pk = parseProgressKey(e.key);
      if (!pk) return;
      // свій код; anon — лише поки код не заведено (після входу вправа стирає anon-копію — це не «скидання»)
      if (pk.code !== currentProgressCode()) return;
      let d: unknown = null;
      if (e.newValue) {
        try {
          d = (JSON.parse(e.newValue) as { d?: unknown }).d ?? null;
        } catch {
          return;
        }
      }
      const key = liveKey(pk.embedPath);
      const cur = pending.get(key) ?? {};
      cur[pk.scope] = d;
      pending.set(key, cur);
      timer ??= setTimeout(flush, BATCH_MS);
    };

    needRef.current = (key) => {
      const s = readAllProgress((ep) => liveKey(ep) === key);
      void sendRef.current({ k: 'st', key, s, full: true });
    };

    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('storage', onStorage);
      if (timer) clearTimeout(timer);
      needRef.current = () => undefined;
    };
  }, [active]);

  if (!active) return null;
  return (
    <div className="ww-live-badge" role="status">
      <span aria-hidden="true">👁</span> {t("Викладач бачить твої відповіді")}
    </div>
  );
}
