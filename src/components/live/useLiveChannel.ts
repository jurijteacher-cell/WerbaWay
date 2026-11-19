'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { CLASS_EVENT, ChunkAssembler, toChunks, type Chunk, type ClassMsg, type Presence } from '@/lib/live/protocol';

export type LinkState = 'connecting' | 'online' | 'offline';

type Opts = {
  /** назва каналу: classTopic(uid) для учня з акаунтом, guestTopic(vid) для гостя */
  topic: string;
  /** what this side announces in presence */
  presence: () => Presence;
  onMessage: (m: ClassMsg) => void;
  onPresence?: (all: Presence[]) => void;
  /** called every time the channel (re)subscribes */
  onSubscribed?: () => void;
};

/**
 * One private Realtime channel shared by the learner (LiveBeacon / GuestBeacon) and the teacher (LiveWatch):
 * `class:<uid>` for a student with an account, `guest:<vid>` for a guest on a public link.
 * Messages are split into chunks and put back together; `send` is a no-op until subscribed.
 */
export function useLiveChannel(opts: Opts) {
  const supabase = useMemo(() => createClient(), []);
  const [link, setLink] = useState<LinkState>('connecting');
  const chRef = useRef<RealtimeChannel | null>(null);
  const optsRef = useRef(opts);
  optsRef.current = opts;
  const readyRef = useRef(false);
  /** коли прийшов останній шматок БАГАТОШМАТКОВОГО повідомлення (знімка) — викладач не просить
   *  новий знімок, поки йде старий. Дрібні повідомлення (якір прокрутки) сюди не рахуються. */
  const lastRx = useRef(0);
  // канал закрився (сервер викинув: протух токен, мережа) — сам supabase-js його не відновлює,
  // тож створюємо заново: gen++ перезапускає ефект; пауза росте 2 → 4 → … → 30 с
  const [gen, setGen] = useState(0);
  const failsRef = useRef(0);

  useEffect(() => {
    let alive = true;
    let retry: ReturnType<typeof setTimeout> | null = null;
    const asm = new ChunkAssembler();
    const key = `${optsRef.current.presence().role}-${Math.random().toString(36).slice(2, 8)}`;
    let ch: RealtimeChannel | null = null;

    (async () => {
      const { data } = await supabase.auth.getSession();
      // гість за посиланням сесії не має: приватний канал guest:<vid> підписуємо анонімним
      // ключем (він і так публічний) — інакше join пішов би без токена й сервер відмовив
      const token = data.session?.access_token ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (token) supabase.realtime.setAuth(token);
      if (!alive) return;
      ch = supabase.channel(opts.topic, {
        // ack: send() чекає, доки сервер прийняв шматок. Без нього supabase-js віддає 'ok' одразу,
        // і весь знімок (десятки шматків) летів у сокет залпом — упирався в ліміт Realtime,
        // канал обривався, викладач просив новий знімок — і так по колу (зависання).
        config: { private: true, presence: { key }, broadcast: { self: false, ack: true } },
      });
      ch.on('broadcast', { event: CLASS_EVENT }, ({ payload }) => {
        if ((payload as Chunk)?.n > 1) lastRx.current = Date.now();
        const m = asm.push(payload as Chunk);
        if (m) optsRef.current.onMessage(m);
      });
      ch.on('presence', { event: 'sync' }, () => {
        const state = ch?.presenceState<Presence>() ?? {};
        optsRef.current.onPresence?.(Object.values(state).flat());
      });
      ch.subscribe(async (status) => {
        if (!alive) return;
        if (status === 'SUBSCRIBED') {
          failsRef.current = 0;
          readyRef.current = true;
          setLink('online');
          await ch?.track(optsRef.current.presence());
          optsRef.current.onSubscribed?.();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          readyRef.current = false;
          setLink('offline');
          if ((status === 'CLOSED' || status === 'CHANNEL_ERROR') && !retry) {
            const wait = Math.min(30_000, 2_000 * 2 ** failsRef.current++);
            retry = setTimeout(() => alive && setGen((g) => g + 1), wait);
          }
        }
      });
      chRef.current = ch;
    })();

    return () => {
      alive = false;
      if (retry) clearTimeout(retry);
      readyRef.current = false;
      if (ch) void supabase.removeChannel(ch);
      chRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.topic, supabase, gen]);

  // шматки одного повідомлення шлемо по черзі: паралельна відправка плутала порядок,
  // а загублений шматок означав, що весь пакет змін до викладача не доїде.
  // Результат — чи дійшло САМЕ це повідомлення: шматок не прийнято → решту не шлемо (без нього
  // вони марні), а викладач побачить розрив у номерах пакетів і попросить свіжий знімок.
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const send = (m: ClassMsg): Promise<boolean> => {
    const ch = chRef.current;
    if (!ch || !readyRef.current) return Promise.resolve(false);
    const chunks = toChunks(m);
    const done = queue.current.then(async () => {
      for (const c of chunks) {
        if (!readyRef.current || chRef.current !== ch) return false;
        const r = await ch.send({ type: 'broadcast', event: CLASS_EVENT, payload: c });
        if (r !== 'ok') return false;
      }
      return true;
    }).catch(() => false);
    queue.current = done;
    return done;
  };

  const track = (p: Presence) => {
    if (chRef.current && readyRef.current) void chRef.current.track(p);
  };

  return { link, send, track, supabase, lastRx };
}
