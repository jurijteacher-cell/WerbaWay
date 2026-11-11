import Link from 'next/link';
import type { PageBlock, ParsedPage } from '@/lib/pages/pages';
import { ClassAgent } from '@/components/class/ClassAgent';
import { EmbedFrame } from './EmbedFrame';
import { HomeworkDone } from './HomeworkDone';
import { LessonOutline } from './LessonOutline';
import './lesson.css';

/** embeds: 'all' | 'none' | 'external' (у кроці класу локальні вправи — окремі кроки, зовнішні лишаються в тексті) */
function Blocks({ blocks, embeds = 'all' }: { blocks: PageBlock[]; embeds?: 'all' | 'none' | 'external' }) {
  return (
    <>
      {blocks.map((b, i) => {
        if (b.k === 'html') return <div key={i} dangerouslySetInnerHTML={{ __html: b.html }} />;
        if (b.k === 'embed') {
          const show = embeds === 'all' || (embeds === 'external' && /^https?:/.test(b.src));
          return show ? <EmbedFrame key={i} src={b.src} title={b.title} kind={b.kind} /> : null;
        }
        return (
          <figure key={i} className="lp-embed" data-kind="video">
            <figcaption>
              <span className="lp-embed-tag">Wideo</span>
              <span className="lp-embed-title">{b.title}</span>
            </figcaption>
            <div className="lp-video">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${b.id}`}
                title={b.title}
                loading="lazy"
                allow="accelerometer; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
              />
            </div>
          </figure>
        );
      })}
    </>
  );
}

type Props = {
  page: ParsedPage;
  mode: 'lecture' | 'homework' | 'step';
  /** step mode: 'goal' або id розділу */
  step?: string;
  /** homework mode: стан із lesson_progress */
  hw?: { assigned: boolean; done: boolean } | null;
};

export function LessonView({ page, mode, step, hw }: Props) {
  const { meta, goal, sections, toc } = page;
  const lecture = sections.filter((s) => s.kind === 'lecture');
  const homework = sections.filter((s) => s.kind === 'homework');

  if (mode === 'step') {
    const sec = step === 'goal' ? null : sections.find((s) => s.id === step);
    return (
      <main className="lp-root lp-step">
        <style dangerouslySetInnerHTML={{ __html: 'body > header{display:none!important}' }} />
        {step === 'goal' && goal && (
          <section className="lp-goal" aria-label="Цілі лекції">
            <span className="lp-goal-icon" aria-hidden="true">
              🎯
            </span>
            <div dangerouslySetInnerHTML={{ __html: goal.replace(/🎯\s*/g, '') }} />
          </section>
        )}
        {sec && (
          <article className="lp-prose">
            <Blocks blocks={sec.blocks} embeds="external" />
          </article>
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
        <div className="lp-layout">
          <div className="lp-col">
            {goal && (
              <section className="lp-goal" aria-label="Цілі лекції">
                <span className="lp-goal-icon" aria-hidden="true">
                  🎯
                </span>
                <div dangerouslySetInnerHTML={{ __html: goal.replace(/🎯\s*/g, '') }} />
              </section>
            )}
            {toc.length > 1 && (
              <div className="lp-outline-mobile">
                <LessonOutline items={toc} />
              </div>
            )}
            <article className="lp-prose">
              {lecture.map((s) => (
                <Blocks key={s.id} blocks={s.blocks} />
              ))}
            </article>
            {page.hasHomework && (
              <Link href={`/learn/${meta.slug}/hw`} className="lp-next">
                <span className="lp-next-label">Далі</span>
                <span className="lp-next-title">Домашнє завдання до цієї лекції</span>
              </Link>
            )}
          </div>
          {toc.length > 1 && (
            <aside className="lp-rail">
              <LessonOutline items={toc} />
            </aside>
          )}
        </div>
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
