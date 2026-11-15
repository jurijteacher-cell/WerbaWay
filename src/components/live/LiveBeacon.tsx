'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useT } from '@/i18n/client';
import { isLessonPath, type ClassMsg, type Presence } from '@/lib/live/protocol';
import { useLiveChannel } from './useLiveChannel';

type Recorder = typeof import('rrweb').record;

/**
 * Учень на сайті: тримає присутність на своєму каналі class:<uid> (онлайн, яка лекція відкрита),
 * а коли викладач відкрив «Дивитися» і учень у лекції — пише екран (rrweb) і шле викладачеві.
 * Учень бачить маленьку позначку «Викладач дивиться». Нічого не блокує й не перехоплює.
 */
export function LiveBeacon({ studentId, name }: { studentId: string; name?: string }) {
  const t = useT();
  const pathname = usePathname();
  const [watched, setWatched] = useState(false);
  const pathRef = useRef(pathname);
  pathRef.current = pathname;
  const titleRef = useRef<string | undefined>(undefined);

  const presence = (): Presence => ({
    role: 'student',
    name,
    mode: isLessonPath(pathRef.current) ? 'lesson' : 'site',
    path: pathRef.current ?? undefined,
    title: titleRef.current,
    at: Date.now(),
  });

  const recRef = useRef<{ stop: () => void; record: Recorder } | null>(null);
  const sendRef = useRef<(m: ClassMsg) => Promise<boolean>>(() => Promise.resolve(false));

  const { send, track, link } = useLiveChannel({
    studentId,
    presence,
    onMessage: (m) => {
      if (m.k === 'need-snap') recRef.current?.record.takeFullSnapshot(true);
    },
    onPresence: (all) => setWatched(all.some((p) => p.role === 'teacher' && p.mode === 'watch')),
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

  const active = watched && isLessonPath(pathname);

  // запис екрана: лише поки active
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let buf: string[] = [];
    let timer: ReturnType<typeof setTimeout> | null = null;
    let inFlight = false;
    let seq = 0;
    // події відправляємо майже одразу, наступну порцію — щойно попередня пішла
    const flush = () => {
      timer = null;
      if (!buf.length) return;
      if (inFlight) {
        timer = setTimeout(flush, 60);
        return;
      }
      const batch = buf;
      buf = [];
      inFlight = true;
      void sendRef.current({ k: 'rr', d: batch, n: ++seq }).finally(() => {
        inFlight = false;
        if (buf.length && !timer) timer = setTimeout(flush, 0);
      });
    };
    (async () => {
      const [{ record }, { pack }] = await Promise.all([import('rrweb'), import('@rrweb/packer')]);
      if (cancelled) return;
      const stop = record({
        emit: (e) => {
          buf.push(e as unknown as string);
          if (!timer) timer = setTimeout(flush, 40);
        },
        packFn: pack,
        inlineStylesheet: true,
        recordCanvas: false,
        // поля паролів rrweb маскує сам; курсор учня викладачеві не потрібен
        sampling: { mousemove: false, scroll: 120, input: 'last' },
      });
      if (!stop) return;
      recRef.current = { stop, record };
    })();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      recRef.current?.stop();
      recRef.current = null;
    };
  }, [active]);

  // учень перегорнув на іншу лекцію чи домашку — свіжий знімок, щоб у викладача не лишилось старе
  useEffect(() => {
    if (!active) return;
    const id = setTimeout(() => recRef.current?.record.takeFullSnapshot(true), 500);
    return () => clearTimeout(id);
  }, [pathname, active]);

  if (!active) return null;
  return (
    <div className="ww-live-badge" role="status">
      <span aria-hidden="true">👁</span> {t("Викладач бачить твій екран")}
    </div>
  );
}
