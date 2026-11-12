import Link from 'next/link';
import type { ParsedPage } from '@/lib/pages/pages';
import { Blocks } from './LessonBlocks';
import './lesson.css';

/** Сторінка «TEACHER · …»: хід уроку, ключі, підказки. Бачить лише викладач. */
export function TeacherNotes({ page, lessonSlug, lessonTitle }: { page: ParsedPage; lessonSlug: string; lessonTitle?: string }) {
  return (
    <main className="lp-root lp-step" style={{ maxWidth: '52rem' }}>
      <p className="lp-teacher-kicker">
        Для викладача
        {lessonTitle && (
          <>
            {' '}
            до лекції <Link href={`/learn/${lessonSlug}`}>{lessonTitle}</Link>
          </>
        )}
      </p>
      <h1 className="lp-teacher-title">
        {page.meta.icon && <span aria-hidden>{page.meta.icon} </span>}
        {page.meta.title}
      </h1>
      {page.goal && <section className="lp-goal" dangerouslySetInnerHTML={{ __html: page.goal }} />}
      <article className="lp-prose">
        {page.sections.map((s) => (
          <Blocks key={s.id} blocks={s.blocks} />
        ))}
      </article>
    </main>
  );
}
