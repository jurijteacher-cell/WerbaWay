'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { classTopic, type Presence } from '@/lib/class/protocol';

type Student = { id: string; name: string };
type Where = 'offline' | 'lobby' | 'class';

/** Teacher's list of students with who is online right now (presence on each class channel). */
export function ClassRoster({ students }: { students: Student[] }) {
  const [where, setWhere] = useState<Record<string, Where>>({});

  useEffect(() => {
    const supabase = createClient();
    let alive = true;
    const channels: ReturnType<typeof supabase.channel>[] = [];
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session?.access_token) supabase.realtime.setAuth(data.session.access_token);
      if (!alive) return;
      for (const s of students) {
        const ch = supabase.channel(classTopic(s.id), { config: { private: true, presence: { key: `roster-${s.id}` } } });
        ch.on('presence', { event: 'sync' }, () => {
          const st = Object.values(ch.presenceState<Presence>()).flat();
          const stu = st.find((p) => p.role === 'student');
          setWhere((w) => ({ ...w, [s.id]: stu ? (stu.mode === 'class' ? 'class' : 'lobby') : 'offline' }));
        });
        ch.subscribe();
        channels.push(ch);
      }
    })();
    return () => {
      alive = false;
      channels.forEach((c) => void supabase.removeChannel(c));
    };
  }, [students]);

  const label: Record<Where, string> = { offline: 'не в мережі', lobby: 'у залі очікування', class: 'у класі' };
  const dot: Record<Where, string> = { offline: 'bg-paper-muted', lobby: 'bg-gold-fill', class: 'bg-correct' };
  const order: Record<Where, number> = { class: 0, lobby: 1, offline: 2 };
  const rows = [...students].sort(
    (a, b) => order[where[a.id] ?? 'offline'] - order[where[b.id] ?? 'offline'] || a.name.localeCompare(b.name)
  );

  return (
    <ul className="divide-y divide-ink-line rounded-lg border border-ink-line">
      {rows.map((s) => {
        const w = where[s.id] ?? 'offline';
        return (
          <li key={s.id} className="flex items-center">
            <Link href={`/teacher/class/${s.id}`} className="flex min-w-0 flex-1 items-center justify-between gap-4 px-4 py-3 hover:bg-gold/5">
              <span className="text-paper">{s.name}</span>
              <span className="flex items-center gap-2 text-sm text-paper-muted">
                <span className={`inline-block h-2.5 w-2.5 rounded-full ${dot[w]}`} />
                {label[w]}
              </span>
            </Link>
            <Link href={`/teacher/students/${s.id}`} className="shrink-0 px-4 py-3 text-sm text-gold hover:text-gold-bright">
              Профіль
            </Link>
          </li>
        );
      })}
      {rows.length === 0 && <li className="px-4 py-6 text-paper-muted">Поки немає учнів з акаунтами.</li>}
    </ul>
  );
}
