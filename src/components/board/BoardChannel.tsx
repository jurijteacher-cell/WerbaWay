'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { BOARD_EVENT, boardTopic, type BoardMsg, type BoardPresence } from '@/lib/board/types';

/**
 * Приватний канал `board:main` (докладаємо до dock:<uid>, не замінюємо). Пише лише викладач;
 * глядач оголошує присутність. Перепідключення 2→30 с, як у DockChannelProvider.
 * `enabled=false` — каналу немає (учень, якого не додано глядачем).
 */
export function useBoardChannel({
  enabled,
  presence,
  onMessage,
  onSubscribed,
}: {
  enabled: boolean;
  presence: (() => BoardPresence) | null;
  onMessage: (m: BoardMsg) => void;
  onSubscribed?: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [link, setLink] = useState<'connecting' | 'online' | 'offline'>('connecting');
  const [peers, setPeers] = useState<BoardPresence[]>([]);
  const [gen, setGen] = useState(0);
  const chRef = useRef<RealtimeChannel | null>(null);
  const readyRef = useRef(false);
  const failsRef = useRef(0);
  const cb = useRef({ presence, onMessage, onSubscribed });
  cb.current = { presence, onMessage, onSubscribed };

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    let retry: ReturnType<typeof setTimeout> | null = null;
    let ch: RealtimeChannel | null = null;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session?.access_token) supabase.realtime.setAuth(data.session.access_token);
      if (!alive) return;
      ch = supabase.channel(boardTopic, {
        config: { private: true, presence: { key: `bd-${Math.random().toString(36).slice(2, 8)}` }, broadcast: { self: false, ack: true } },
      });
      ch.on('broadcast', { event: BOARD_EVENT }, ({ payload }) => {
        const m = payload as BoardMsg;
        if (m && typeof m.k === 'string') cb.current.onMessage(m);
      });
      ch.on('presence', { event: 'sync' }, () => {
        setPeers(Object.values(ch?.presenceState<BoardPresence>() ?? {}).flat());
      });
      ch.subscribe(async (status) => {
        if (!alive) return;
        if (status === 'SUBSCRIBED') {
          failsRef.current = 0;
          readyRef.current = true;
          setLink('online');
          const p = cb.current.presence;
          if (p) await ch?.track(p());
          cb.current.onSubscribed?.();
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
      setPeers([]);
    };
  }, [enabled, supabase, gen]);

  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const send = useCallback((m: BoardMsg): Promise<boolean> => {
    const ch = chRef.current;
    if (!ch || !readyRef.current) return Promise.resolve(false);
    const done = queue.current
      .then(async () => (readyRef.current && chRef.current === ch ? (await ch.send({ type: 'broadcast', event: BOARD_EVENT, payload: m })) === 'ok' : false))
      .catch(() => false);
    queue.current = done;
    return done;
  }, []);

  return { link, peers, send };
}
