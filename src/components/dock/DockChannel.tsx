'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { DOCK_EVENT, type DockMsg, type DockPresence } from '@/lib/dock/protocol';

export type DockLink = 'connecting' | 'online' | 'offline';

type Ctx = {
  link: DockLink;
  /** true, якщо повідомлення прийнято сервером */
  send: (m: DockMsg) => Promise<boolean>;
  /** оновити свою присутність (учень: де він) */
  track: (p: DockPresence) => void;
  /** присутність усіх на каналі */
  peers: DockPresence[];
  /** підписка на вхідні повідомлення; повертає відписку */
  listen: (fn: (m: DockMsg) => void) => () => void;
  /** росте щоразу, коли канал (пере)підписався — привід догрузити історію */
  subscribedTick: number;
};

const DockCtx = createContext<Ctx | null>(null);

export function useDock(): Ctx {
  const c = useContext(DockCtx);
  if (!c) throw new Error('useDock outside DockChannelProvider');
  return c;
}

/**
 * Один приватний канал `dock:<uid>` на вкладку; чат (і далі слова, дошка) слухають його через контекст —
 * два supabase.channel() з однаковою назвою в одній вкладці конфліктують.
 * Той самий websocket, що й у «Дивитися учня»; логіка перепідключення (2→30 с) така сама, як у useLiveChannel,
 * але useLiveChannel не чіпаємо.
 */
export function DockChannelProvider({
  topic,
  presence,
  children,
}: {
  topic: string;
  /** що ми оголошуємо в присутності; null — нічого не оголошуємо (викладач) */
  presence: (() => DockPresence) | null;
  children: ReactNode;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [link, setLink] = useState<DockLink>('connecting');
  const [peers, setPeers] = useState<DockPresence[]>([]);
  const [subscribedTick, setTick] = useState(0);
  const [gen, setGen] = useState(0);
  const chRef = useRef<RealtimeChannel | null>(null);
  const readyRef = useRef(false);
  const failsRef = useRef(0);
  const presenceRef = useRef(presence);
  presenceRef.current = presence;
  const listeners = useRef(new Set<(m: DockMsg) => void>());

  useEffect(() => {
    let alive = true;
    let retry: ReturnType<typeof setTimeout> | null = null;
    let ch: RealtimeChannel | null = null;
    const key = `dock-${Math.random().toString(36).slice(2, 8)}`;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session?.access_token) supabase.realtime.setAuth(data.session.access_token);
      if (!alive) return;
      ch = supabase.channel(topic, {
        config: { private: true, presence: { key }, broadcast: { self: false, ack: true } },
      });
      ch.on('broadcast', { event: DOCK_EVENT }, ({ payload }) => {
        const m = payload as DockMsg;
        if (!m || typeof m.k !== 'string') return;
        listeners.current.forEach((fn) => {
          try {
            fn(m);
          } catch (e) {
            console.error('[dock] listener', e);
          }
        });
      });
      ch.on('presence', { event: 'sync' }, () => {
        const st = ch?.presenceState<DockPresence>() ?? {};
        setPeers(Object.values(st).flat());
      });
      ch.subscribe(async (status) => {
        if (!alive) return;
        if (status === 'SUBSCRIBED') {
          failsRef.current = 0;
          readyRef.current = true;
          setLink('online');
          const p = presenceRef.current;
          if (p) await ch?.track(p());
          setTick((n) => n + 1);
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
  }, [topic, supabase, gen]);

  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const send = useCallback((m: DockMsg): Promise<boolean> => {
    const ch = chRef.current;
    if (!ch || !readyRef.current) return Promise.resolve(false);
    const done = queue.current
      .then(async () => {
        if (!readyRef.current || chRef.current !== ch) return false;
        const r = await ch.send({ type: 'broadcast', event: DOCK_EVENT, payload: m });
        return r === 'ok';
      })
      .catch(() => false);
    queue.current = done;
    return done;
  }, []);

  const track = useCallback((p: DockPresence) => {
    if (chRef.current && readyRef.current) void chRef.current.track(p);
  }, []);

  const listen = useCallback((fn: (m: DockMsg) => void) => {
    listeners.current.add(fn);
    return () => {
      listeners.current.delete(fn);
    };
  }, []);

  const value = useMemo(() => ({ link, send, track, peers, listen, subscribedTick }), [link, send, track, peers, listen, subscribedTick]);
  return <DockCtx.Provider value={value}>{children}</DockCtx.Provider>;
}
