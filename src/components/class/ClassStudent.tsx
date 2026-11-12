'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { FRAME_TAG, isCourseRoom, roomUrl, type ClassMsg, type RoomState } from '@/lib/class/protocol';
import { useSteps } from './StepNav';
import './class.css';
import { useClassChannel } from './useClassChannel';

type Props = { userId: string; name: string; initialRoom: RoomState };

/** Student side of the class: waiting room → the lesson the teacher opened, mirrored live to the teacher. */
export function ClassStudent({ userId, name, initialRoom }: Props) {
  const [room, setRoom] = useState<RoomState>(initialRoom);
  const roomRef = useRef(room);
  roomRef.current = room;
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const buf = useRef<string[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sendRef = useRef<(m: ClassMsg) => boolean>(() => false);

  const toFrame = useCallback((m: Record<string, unknown>) => {
    frameRef.current?.contentWindow?.postMessage({ ww: FRAME_TAG, ...m }, window.location.origin);
  }, []);

  const { link, send, track, supabase } = useClassChannel({
    studentId: userId,
    presence: () => ({ role: 'student', name, mode: roomRef.current.active ? 'class' : 'lobby', at: Date.now() }),
    onMessage: (m) => {
      if (m.k === 'room') setRoom(m.room);
      else if (m.k === 'need-snap') toFrame({ k: 'need-snap' });
      else if (m.k === 'click') toFrame({ k: 'click', id: m.id, tag: m.tag, text: m.text, path: m.path });
    },
    onSubscribed: () => {
      // after (re)connecting: pick up the room from the database and give the teacher a fresh picture
      void supabase
        .from('class_rooms')
        .select('active, lesson_id, embed, blocks')
        .eq('student_id', userId)
        .maybeSingle()
        .then(({ data }) => data && setRoom(data as RoomState));
      toFrame({ k: 'need-snap' });
    },
  });
  sendRef.current = send;

  // keep presence in step with the room
  useEffect(() => {
    track({ role: 'student', name, mode: room.active ? 'class' : 'lobby', at: Date.now() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.active, link]);

  // events from the exercise iframe → batched to the teacher (≈2 messages a second at most)
  useEffect(() => {
    const flush = () => {
      timer.current = null;
      if (!buf.current.length) return;
      const batch = buf.current;
      buf.current = [];
      sendRef.current({ k: 'rr', d: batch });
    };
    const onMsg = (ev: MessageEvent) => {
      if (ev.origin !== window.location.origin || ev.source !== frameRef.current?.contentWindow) return;
      const m = ev.data;
      if (!m || m.ww !== FRAME_TAG) return;
      if (m.k === 'ev' && typeof m.e === 'string') {
        buf.current.push(m.e);
        if (!timer.current) timer.current = setTimeout(flush, 450);
      } else if (m.k === 'ready') {
        toFrame({ k: 'need-snap' });
      }
    };
    window.addEventListener('message', onMsg);
    return () => {
      window.removeEventListener('message', onMsg);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [toFrame]);

  const url = roomUrl(room);
  // кроки потрібні лише для напрямку перегортання — список сторінок малює сама лекція
  const course = useSteps(isCourseRoom(room) && room.active ? room.lesson_id : null);

  /* ── перегортання сторінок: нова сторінка вантажиться під поточною, потім стара перегортається ── */
  type Sheet = { id: number; url: string; role: 'current' | 'incoming' | 'leaving' | 'entering' | 'under' };
  const [sheets, setSheets] = useState<Sheet[]>(() => (url ? [{ id: 0, url, role: 'current' }] : []));
  const seq = useRef(1);
  const dirRef = useRef<'next' | 'prev'>('next');
  const prevBlocks = useRef<string | null>(room.blocks);
  const stepsRef = useRef(course?.steps);
  stepsRef.current = course?.steps;

  useEffect(() => {
    // напрям — за порядком сторінок лекції (назад = аркуш повертається)
    const steps = stepsRef.current;
    if (steps && prevBlocks.current && room.blocks) {
      const a = steps.findIndex((s) => s.url === prevBlocks.current);
      const b = steps.findIndex((s) => s.url === room.blocks);
      dirRef.current = a >= 0 && b >= 0 && b < a ? 'prev' : 'next';
    } else dirRef.current = 'next';
    prevBlocks.current = room.blocks;

    if (!url) {
      setSheets([]);
      return;
    }
    setSheets((fs) => {
      const top = fs[fs.length - 1];
      if (top && top.url === url) return fs;
      const cur = fs.filter((f) => f.role === 'current').slice(-1);
      const id = seq.current++;
      return cur.length ? [...cur, { id, url, role: 'incoming' }] : [{ id, url, role: 'current' }];
    });
  }, [url, room.blocks]);

  const turnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSheetLoad = (id: number) => {
    setSheets((fs) => {
      const me = fs.find((f) => f.id === id);
      if (!me || me.role !== 'incoming') return fs;
      const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      if (reduce) return [{ ...me, role: 'current' }];
      const next = dirRef.current === 'next';
      return fs
        .filter((f) => f.role === 'current' || f.id === id)
        .map((f) => (f.id === id ? { ...f, role: next ? 'current' : 'entering' } : { ...f, role: next ? 'leaving' : 'under' }));
    });
    if (turnTimer.current) clearTimeout(turnTimer.current);
    turnTimer.current = setTimeout(() => {
      setSheets((fs) => {
        const top = fs.find((f) => f.id === id);
        return top && top.role !== 'incoming' ? [{ ...top, role: 'current' }] : fs;
      });
    }, 780);
  };
  useEffect(() => () => void (turnTimer.current && clearTimeout(turnTimer.current)), []);
  const newestId = sheets.length ? sheets[sheets.length - 1].id : -1;
  const waiting = link !== 'online';

  return (
    <div className="cls-root">
      {url ? (
        <div className="cls-book">
          {sheets.map((sh) => (
            <div key={sh.id} className={`cls-sheet is-${sh.role}`}>
              <iframe
                ref={
                  sh.id === newestId
                    ? (el) => {
                        frameRef.current = el;
                      }
                    : undefined
                }
                src={sh.url}
                title="Заняття"
                onLoad={() => onSheetLoad(sh.id)}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="cls-wait">
          <div>
            <p className="cls-wait-title">Чекаємо на викладача</p>
            <p className="cls-wait-sub">Коли урок почнеться, він відкриється тут сам. Нічого натискати не треба.</p>
          </div>
        </div>
      )}
      {waiting && (
        <p className="cls-link" role="status">
          {link === 'connecting' ? 'підключаюсь…' : 'немає зв’язку, пробую знову'}
        </p>
      )}
    </div>
  );
}
