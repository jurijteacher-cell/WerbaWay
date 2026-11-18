'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { pickStudent, type Presence } from '@/lib/live/protocol';

/**
 * Хто зараз на сайті і в якій лекції — присутність на кожному каналі зі списку
 * (classTopic(uid) для учнів з акаунтом, guestTopic(vid) для гостей за посиланням).
 * Ключ результату — та сама назва каналу. Викладач лише слухає (нічого не track-ає),
 * тож запис екрана в учня від цього не вмикається.
 */
export function useLiveStatuses(topics: string[]): Record<string, Presence | null> {
  const [state, setState] = useState<Record<string, Presence | null>>({});
  const key = [...new Set(topics)].sort().join(',');
  // канал закрився (протух токен, мережа) — перепідписуємось на всіх через паузу
  const [gen, setGen] = useState(0);

  useEffect(() => {
    const list = key ? key.split(',') : [];
    if (!list.length) return;
    const supabase = createClient();
    let alive = true;
    let retry: ReturnType<typeof setTimeout> | null = null;
    const channels: ReturnType<typeof supabase.channel>[] = [];
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session?.access_token) supabase.realtime.setAuth(data.session.access_token);
      if (!alive) return;
      for (const topic of list) {
        const ch = supabase.channel(topic, { config: { private: true, presence: { key: `list-${Math.random().toString(36).slice(2, 8)}` } } });
        ch.on('presence', { event: 'sync' }, () => {
          const s = pickStudent(Object.values(ch.presenceState<Presence>()).flat());
          setState((cur) => ({ ...cur, [topic]: s }));
        });
        ch.subscribe((status) => {
          if (!alive || retry || (status !== 'CLOSED' && status !== 'CHANNEL_ERROR')) return;
          retry = setTimeout(() => alive && setGen((g) => g + 1), 5_000);
        });
        channels.push(ch);
      }
    })();
    return () => {
      alive = false;
      if (retry) clearTimeout(retry);
      channels.forEach((c) => void supabase.removeChannel(c));
    };
  }, [key, gen]);

  return state;
}
