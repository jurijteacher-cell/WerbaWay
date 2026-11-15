'use client';

import Link from 'next/link';
import { useT } from '@/i18n/client';
import { isLessonPath, lessonSlugOf, type Presence } from '@/lib/live/protocol';
import { useLiveStatuses } from './useLiveStatuses';

/** Позначка біля учня: «у лекції …» з кнопкою «Дивитися» / «на сайті» / нічого, якщо офлайн */
export function LiveBadge({ studentId, status, withButton = true }: { studentId: string; status: Presence | null | undefined; withButton?: boolean }) {
  const t = useT();
  if (!status) return null;
  const inLesson = status.mode === 'lesson' && isLessonPath(status.path);
  return (
    <span className="relative z-10 flex flex-wrap items-center gap-2 text-xs">
      <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 ${inLesson ? 'bg-correct/10 text-correct' : 'bg-ink-soft text-paper-muted'}`}>
        <span className={`inline-block h-2 w-2 rounded-full ${inLesson ? 'bg-correct' : 'bg-gold-fill'}`} />
        {inLesson ? t("у лекції: {title}", { title: status.title || lessonSlugOf(status.path) || '' }) : t("на сайті")}
      </span>
      {inLesson && withButton && (
        <Link href={`/teacher/students/${studentId}/watch`} className="ww-btn ww-btn-primary ww-btn-sm">
          {t("👁 Дивитися")}
        </Link>
      )}
    </span>
  );
}

/** Те саме для одного учня (сторінка учня): сам підписується на присутність */
export function LiveBadgeFor({ studentId }: { studentId: string }) {
  const s = useLiveStatuses([studentId]);
  return <LiveBadge studentId={studentId} status={s[studentId]} />;
}
