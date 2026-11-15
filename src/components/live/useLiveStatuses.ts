'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { classTopic, pickStudent, type Presence } from '@/lib/live/protocol';

/**
 * Хто з учнів зараз на сайті і в якій лекції — присутність на каналі кожного учня.
 * Викладач лише слухає (нічого не track-ає), тож запис екрана в учня від цього не вмикається.
 */
export function useLiveStatuses(ids: string[]): Record<string, Presence | null> {
  const [state, setState] = useState<Record<string, Presence | null>>({});
  const key = [...new Set(ids)].sort().join(',');

  useEffect(() => {
    const list = key ? key.split(',') : [];
    if (!list.length) return;
    const supabase = createClient();
    let alive = true;
    const channels: ReturnType<typeof supabase.channel>[] = [];
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session?.access_token) supabase.realtime.setAuth(data.session.access_token);
      if (!alive) return;
      for (const id of list) {
        const ch = supabase.channel(classTopic(id), { config: { private: true, presence: { key: `list-${Math.random().toString(36).slice(2, 8)}` } } });
        ch.on('presence', { event: 'sync' }, () => {
          const s = pickStudent(Object.values(ch.presenceState<Presence>()).flat());
          setState((cur) => ({ ...cur, [id]: s }));
        });
        ch.subscribe();
        channels.push(ch);
      }
    })();
    return () => {
      alive = false;
      channels.forEach((c) => void supabase.removeChannel(c));
    };
  }, [key]);

  return state;
}
