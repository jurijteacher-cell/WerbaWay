'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { FRAME_TAG, roomUrl, type ClassMsg, type RoomState } from '@/lib/class/protocol';
import { useClassChannel } from './useClassChannel';

type Props = { userId: string; name: string; initialRoom: RoomState };

/** Student side of the class: waiting room → the lesson the teacher opened, mirrored live to the teacher. */
export function ClassStudent({ userId, name, initialRoom }: Props) {
  const [room, setRoom] = useState<RoomState>(initialRoom);
  const roomRef = useRef(room);
  roomRef.current = room;
  const frameRef = useRef<HTMLIFrameElement>(null);
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
      else if (m.k === 'click') toFrame({ k: 'click', id: m.id });
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
  const dot = link === 'online' ? 'bg-correct' : link === 'connecting' ? 'bg-gold' : 'bg-incorrect';
  const label = link === 'online' ? 'на зв’язку' : link === 'connecting' ? 'підключаюсь…' : 'немає зв’язку, пробую знову';

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between gap-3 border-b border-ink-line px-4 py-3">
        <span className="font-display text-lg text-paper">Клас · {name}</span>
        <span className="flex items-center gap-2 text-sm text-paper-muted">
          <span className={`inline-block h-2.5 w-2.5 rounded-full ${dot}`} />
          {label}
        </span>
      </header>
      {url ? (
        <iframe
          key={url}
          ref={frameRef}
          src={url}
          title="Заняття"
          className="w-full flex-1 border-0 bg-white"
          style={{ minHeight: 'calc(100vh - 56px)' }}
        />
      ) : (
        <div className="flex flex-1 items-center justify-center px-6 text-center">
          <div>
            <p className="mb-2 font-display text-3xl text-paper">Чекаємо на викладача</p>
            <p className="text-paper-muted">Коли урок почнеться, він відкриється тут сам. Нічого натискати не треба.</p>
          </div>
        </div>
      )}
    </div>
  );
}
