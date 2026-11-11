'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import {
  CLASS_EVENT,
  ChunkAssembler,
  classTopic,
  toChunks,
  type Chunk,
  type ClassMsg,
  type Presence,
} from '@/lib/class/protocol';

export type LinkState = 'connecting' | 'online' | 'offline';

type Opts = {
  studentId: string;
  /** what this side announces in presence */
  presence: () => Presence;
  onMessage: (m: ClassMsg) => void;
  onPresence?: (all: Presence[]) => void;
  /** called every time the channel (re)subscribes */
  onSubscribed?: () => void;
};

/**
 * One private Realtime channel `class:<studentId>` shared by the student page and the teacher page.
 * Messages are split into chunks and put back together; `send` is a no-op until subscribed.
 */
export function useClassChannel(opts: Opts) {
  const supabase = useMemo(() => createClient(), []);
  const [link, setLink] = useState<LinkState>('connecting');
  const chRef = useRef<RealtimeChannel | null>(null);
  const optsRef = useRef(opts);
  optsRef.current = opts;
  const readyRef = useRef(false);

  useEffect(() => {
    let alive = true;
    const asm = new ChunkAssembler();
    const key = `${optsRef.current.presence().role}-${Math.random().toString(36).slice(2, 8)}`;
    let ch: RealtimeChannel | null = null;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session?.access_token) supabase.realtime.setAuth(data.session.access_token);
      if (!alive) return;
      ch = supabase.channel(classTopic(opts.studentId), {
        config: { private: true, presence: { key }, broadcast: { self: false } },
      });
      ch.on('broadcast', { event: CLASS_EVENT }, ({ payload }) => {
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
          readyRef.current = true;
          setLink('online');
          await ch?.track(optsRef.current.presence());
          optsRef.current.onSubscribed?.();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          readyRef.current = false;
          setLink('offline');
        }
      });
      chRef.current = ch;
    })();

    return () => {
      alive = false;
      readyRef.current = false;
      if (ch) void supabase.removeChannel(ch);
      chRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.studentId, supabase]);

  const send = (m: ClassMsg) => {
    const ch = chRef.current;
    if (!ch || !readyRef.current) return false;
    for (const c of toChunks(m)) void ch.send({ type: 'broadcast', event: CLASS_EVENT, payload: c });
    return true;
  };

  const track = (p: Presence) => {
    if (chRef.current && readyRef.current) void chRef.current.track(p);
  };

  return { link, send, track, supabase };
}
