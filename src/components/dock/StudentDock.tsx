'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { dockTopic, type DockPresence } from '@/lib/dock/protocol';
import { lessonSlugOf } from '@/lib/live/protocol';
import { DockChannelProvider, useDock } from './DockChannel';
import { DockBoundary } from './DockBoundary';
import { ClassDock } from './ClassDock';

/** сторінка лекції з ?p= (1-based) — поки подія ww:lesson-page ще не прийшла */
function pageFromUrl(): number | undefined {
  try {
    const p = Number(new URLSearchParams(window.location.search).get('p'));
    return Number.isFinite(p) && p >= 1 ? p - 1 : 0;
  } catch {
    return undefined;
  }
}

/**
 * Док учня: монтується в TopNav на всіх сторінках, де є LiveBeacon. Лише у вікні верхнього рівня
 * (вправи в лекції — iframe, у них дока немає), не в /embed і /slides.
 */
export function StudentDock({ studentId, name }: { studentId: string; name?: string }) {
  const pathname = usePathname();
  const [topLevel, setTopLevel] = useState(false);
  useEffect(() => {
    try {
      setTopLevel(window.self === window.top);
    } catch {
      setTopLevel(false);
    }
  }, []);
  if (!topLevel || /^\/(embed|slides|s)(\/|$)/.test(pathname ?? '')) return null;
  return (
    <DockBoundary>
      <StudentDockInner studentId={studentId} name={name} />
    </DockBoundary>
  );
}

function StudentDockInner({ studentId, name }: { studentId: string; name?: string }) {
  const pathname = usePathname() ?? '';
  const pathRef = useRef(pathname);
  pathRef.current = pathname;
  const pgRef = useRef<number | undefined>(undefined);
  const [pg, setPg] = useState<number | null>(null);

  useEffect(() => {
    const on = (e: Event) => {
      const d = (e as CustomEvent).detail;
      pgRef.current = typeof d === 'number' ? d : undefined;
      setPg(typeof d === 'number' ? d : null);
    };
    window.addEventListener('ww:lesson-page', on);
    return () => window.removeEventListener('ww:lesson-page', on);
  }, []);

  const slug = lessonSlugOf(pathname);
  const presence = (): DockPresence => ({
    role: 'student',
    name,
    path: pathRef.current,
    pg: lessonSlugOf(pathRef.current) ? pgRef.current ?? pageFromUrl() : undefined,
    at: Date.now(),
  });

  return (
    <DockChannelProvider topic={dockTopic(studentId)} presence={presence}>
      <PresenceSync pathname={pathname} pg={pg} presence={presence} />
      <ClassDock role="student" studentId={studentId} lesson={slug ? { slug, pg: pg ?? pageFromUrl() ?? null } : null} />
    </DockChannelProvider>
  );
}


/** переоголошує присутність, коли учень перейшов на іншу сторінку / сторінку лекції */
function PresenceSync({ pathname, pg, presence }: { pathname: string; pg: number | null; presence: () => DockPresence }) {
  const { track, link } = useDock();
  useEffect(() => {
    if (link === 'online') track(presence());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, pg, link]);
  return null;
}

