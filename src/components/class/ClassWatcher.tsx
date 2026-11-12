'use client';

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

function Watch({ studentId, name }: { studentId: string; name?: string }) {
  const router = useRouter();
  useClassChannel({
    studentId,
    presence: () => ({ role: 'student', name, mode: 'site', at: Date.now() }),
    onMessage: (m) => {
      // викладач відкрив урок — заходимо в клас, нічого натискати не треба
      if (m.k === 'room' && m.room.active) router.push('/class');
    },
  });
  return null;
}
