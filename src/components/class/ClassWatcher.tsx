'use client';

import { useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useClassChannel } from './useClassChannel';

/**
 * Учень на сайті: тримає присутність на своєму каналі class:<uid> з будь-якої сторінки,
 * щоб викладач бачив його онлайн, і сам переводить його в /class, коли викладач відкрив урок.
 * На самій сторінці класу не потрібен — там працює ClassStudent.
 */
export function ClassWatcher({ studentId, name }: { studentId: string; name?: string }) {
  const pathname = usePathname();
  if (pathname?.startsWith('/class')) return null;
  return <Watch studentId={studentId} name={name} />;
}

/** урок вважаємо живим, якщо викладач щось відкривав протягом цього часу */
const LIVE_MS = 15 * 60 * 1000;
/** якщо учень сам вийшов із класу щойно — не тягнемо його назад (поверне наступна дія викладача) */
const LEFT_MS = 2 * 60 * 1000;

function justLeftClass() {
  try {
    return Date.now() - Number(sessionStorage.getItem('ww_class_at') ?? 0) < LEFT_MS;
  } catch {
    return false;
  }
}

function Watch({ studentId, name }: { studentId: string; name?: string }) {
  const router = useRouter();
  const { supabase } = useClassChannel({
    studentId,
    presence: () => ({ role: 'student', name, mode: 'site', at: Date.now() }),
    onMessage: (m) => {
      // викладач відкрив урок — заходимо в клас, нічого натискати не треба
      if (m.k === 'room' && m.room.active) router.push('/class');
    },
    onSubscribed: () => {
      // учень зайшов на сайт, коли урок уже йде (або оновив сторінку) — теж заводимо в клас
      void supabaseRef.current
        ?.from('class_rooms')
        .select('active, updated_at')
        .eq('student_id', studentId)
        .maybeSingle()
        .then(({ data }: { data: { active: boolean; updated_at: string } | null }) => {
          if (!data?.active) return;
          const fresh = Date.now() - new Date(data.updated_at).getTime() < LIVE_MS;
          if (fresh && !justLeftClass()) router.push('/class');
        });
    },
  });
  const supabaseRef = useRef(supabase);
  supabaseRef.current = supabase;
  return null;
}
