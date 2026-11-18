'use client';

import Link from 'next/link';
import { useT } from '@/i18n/client';
import { classTopic, isLessonPath, lessonSlugOf, type Presence } from '@/lib/live/protocol';
import { useLiveStatuses } from './useLiveStatuses';

/**
 * Позначка біля учня чи гостя: «у лекції …» з кнопкою «Дивитися» / «на сайті» / нічого, якщо офлайн.
 * `watchHref` — куди веде «Дивитися» (/teacher/students/<id>/watch або /teacher/guests/<vid>/watch).
 */
export function LiveBadge({
  watchHref,
  status,
  withButton = true,
}: {
  watchHref: string;
  status: Presence | null | undefined;
  withButton?: boolean;
}) {
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
        <Link href={watchHref} className="ww-btn ww-btn-primary ww-btn-sm">
          {t("👁 Дивитися")}
        </Link>
      )}
    </span>
  );
}

/** Те саме для одного учня (сторінка учня): сам підписується на присутність */
export function LiveBadgeFor({ studentId }: { studentId: string }) {
  const topic = classTopic(studentId);
  const s = useLiveStatuses([topic]);
  return <LiveBadge watchHref={`/teacher/students/${studentId}/watch`} status={s[topic]} />;
}
