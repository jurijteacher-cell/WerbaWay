import Link from 'next/link';
import { buildPages, type ParsedPage } from '@/lib/pages/pages';
import { ClassAgent } from '@/components/class/ClassAgent';
import { HomeworkDone } from './HomeworkDone';
import { Blocks, SheetBody } from './LessonBlocks';
import { LessonPager } from './LessonPager';
import { PageList } from './PageList';
import { ShareButton } from './ShareButton';
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
  /** публічне посилання: адреса лекції /s/<токен>, без меню сайту */
  publicBase?: string;
  /** викладач: кнопка «Поділитися» */
  canShare?: boolean;
};

export function LessonView({ page, mode, step, hw, pageIndex = 0, teacherNotes, publicBase, canShare }: Props) {
  const base = publicBase ?? `/learn/${page.meta.slug}`;
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
    // у класі сторінка виглядає так само, як лекція: шапка з обкладинкою, список сторінок збоку, аркуш
    return (
      <main className="lp-root lp-class">
        <style
          dangerouslySetInnerHTML={{
            // всередині класу сторінка займає весь кадр: без шапки сайту й без нижньої панелі
            __html: 'body > header{display:none!important}.ww-tabbar{display:none!important}body{padding-bottom:0!important}',
          }}
        />
        <LessonHero meta={meta}>
          <dl className="lp-props">
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
          </dl>
        </LessonHero>
        <div className="lp-pager">
          <aside className="lp-pager-rail" aria-label="Сторінки лекції">
            <PageList pages={book} idx={i} visited={new Set(Array.from({ length: i }, (_, n) => n))} classNav />
          </aside>
          <div className="lp-pager-main">
            <div className="lp-book">
              {sheet && (
                <section className="lp-sheet is-current" data-kind={sheet.kind}>
                  <SheetBody page={sheet} index={i} total={book.length} embeds="external" />
                </section>
              )}
            </div>
          </div>
        </div>
        <ClassAgent />
      </main>
    );
  }

  const exercises = lecture.reduce((n, s) => n + s.blocks.filter((b) => b.k === 'embed').length, 0);

  return (
    <main className="lp-root">
      <LessonHero meta={meta}>
        {canShare && (
          <div className="mb-4">
            <ShareButton slug={meta.slug} title={meta.title} />
          </div>
        )}
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
                  <Link href={base}>Повернутися до лекції</Link>
                ) : (
                  <Link href={`${base}/hw`}>Відкрити домашнє завдання</Link>
                )}
              </dd>
            </div>
          )}
        </dl>
      </LessonHero>

      {mode === 'lecture' && (
        <LessonPager
          slug={meta.slug}
          pages={book}
          initial={pageIndex}
          hasHomework={page.hasHomework}
          base={base}
          doneHref={publicBase ? null : '/learn'}
        />
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

/** Шапка сторінки як у Notion: обкладинка на всю ширину, іконка-наліпка, заголовок, властивості */
function LessonHero({ meta, children }: { meta: ParsedPage['meta']; children: React.ReactNode }) {
  return (
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
        {children}
      </div>
    </header>
  );
}
