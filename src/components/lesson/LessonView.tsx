import Link from 'next/link';
import { buildPages, type ParsedPage } from '@/lib/pages/pages';
import { ClassAgent } from '@/components/class/ClassAgent';
import { HomeworkDone } from './HomeworkDone';
import { Blocks, SheetBody } from './LessonBlocks';
import { LessonPager } from './LessonPager';
import './lesson.css';

type Props = {
  page: ParsedPage;
  mode: 'lecture' | 'homework' | 'step';
  /** step mode: ключ сторінки (goal, «розділ~n») */
  step?: string;
  /** lecture mode: номер сторінки (з 0) */
  pageIndex?: number;
  /** показати викладачеві посилання на його нотатки */
  teacherNotes?: boolean;
  /** homework mode: стан із lesson_progress */
  hw?: { assigned: boolean; done: boolean } | null;
};

export function LessonView({ page, mode, step, hw, pageIndex = 0, teacherNotes }: Props) {
  const { meta, sections } = page;
  const book = buildPages(page);
  const lecture = sections.filter((s) => s.kind === 'lecture');
  const homework = sections.filter((s) => s.kind === 'homework');

  if (mode === 'step') {
    // старі посилання з класу вели на id розділу — тоді беремо першу сторінку розділу
    const i = Math.max(
      0,
      book.findIndex((p) => p.key === step || p.key.startsWith(`${step}~`))
    );
    const sheet = book[i];
    return (
      <main className="lp-root lp-step">
        <style dangerouslySetInnerHTML={{ __html: 'body > header{display:none!important}' }} />
        {sheet && (
          <section className="lp-sheet is-current lp-sheet-class" data-kind={sheet.kind}>
            <SheetBody page={sheet} index={i} total={book.length} embeds="external" />
          </section>
        )}
        <ClassAgent />
      </main>
    );
  }

  const exercises = lecture.reduce((n, s) => n + s.blocks.filter((b) => b.k === 'embed').length, 0);

  return (
    <main className="lp-root">
      {/* Шапка як у Notion: обкладинка на всю ширину, іконка-наліпка, заголовок, властивості */}
      <header className="lp-hero">
        <div className="lp-cover-wrap">
          {meta.cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={meta.cover} alt="" className="lp-cover" />
          ) : (
            <div className="lp-cover lp-cover-empty" />
          )}
          <div className="lp-stripe" aria-hidden="true" />
        </div>
        <div className="lp-hero-body">
          <div className="lp-icon" aria-hidden="true">
            {meta.icon ?? '📘'}
          </div>
          <h1>{meta.title}</h1>
          <dl className="lp-props">
            {mode === 'homework' && (
              <div>
                <dt>Сторінка</dt>
                <dd>
                  <span className="lp-chip lp-badge-hw">Домашнє завдання</span>
                </dd>
              </div>
            )}
            {meta.level && (
              <div>
                <dt>Рівень</dt>
                <dd>
                  <span className="lp-chip lp-chip-level">{meta.level}</span>
                </dd>
              </div>
            )}
            {meta.moduleTitle && (
              <div>
                <dt>Курс</dt>
                <dd>
                  {meta.moduleTitle}
                  {meta.number != null && <span className="lp-muted">, урок {meta.number}</span>}
                </dd>
              </div>
            )}
            {mode === 'lecture' && exercises > 0 && (
              <div>
                <dt>Вправи</dt>
                <dd>{exercises} інтерактивних вікон</dd>
              </div>
            )}
            {teacherNotes && (
              <div>
                <dt>Викладачеві</dt>
                <dd>
                  <Link href={`/teacher/lesson/${meta.slug}`}>Нотатки до уроку</Link>
                </dd>
              </div>
            )}
            {page.hasHomework && (
              <div>
                <dt>{mode === 'homework' ? 'Лекція' : 'Домашка'}</dt>
                <dd>
                  {mode === 'homework' ? (
                    <Link href={`/learn/${meta.slug}`}>Повернутися до лекції</Link>
                  ) : (
                    <Link href={`/learn/${meta.slug}/hw`}>Відкрити домашнє завдання</Link>
                  )}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </header>

      {mode === 'lecture' && (
        <LessonPager slug={meta.slug} pages={book} initial={pageIndex} hasHomework={page.hasHomework} />
      )}

      {mode === 'homework' && (
        <div className="lp-layout">
          <div className="lp-col">
            <article className="lp-prose">
              {homework.map((s) => (
                <Blocks key={s.id} blocks={s.blocks} />
              ))}
            </article>
            {hw && <HomeworkDone slug={meta.slug} assigned={hw.assigned} done={hw.done} />}
          </div>
        </div>
      )}
    </main>
  );
}
