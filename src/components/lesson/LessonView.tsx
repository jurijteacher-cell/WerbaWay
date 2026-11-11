import Link from 'next/link';
import type { PageBlock, ParsedPage } from '@/lib/pages/pages';
import { ClassAgent } from '@/components/class/ClassAgent';
import { EmbedFrame } from './EmbedFrame';
import { HomeworkDone } from './HomeworkDone';
import './lesson.css';

function Blocks({ blocks, embeds = true }: { blocks: PageBlock[]; embeds?: boolean }) {
  return (
    <>
      {blocks.map((b, i) => {
        if (b.k === 'html') return <div key={i} dangerouslySetInnerHTML={{ __html: b.html }} />;
        if (b.k === 'embed') return embeds ? <EmbedFrame key={i} src={b.src} title={b.title} kind={b.kind} /> : null;
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
      <main className="lp-root mx-auto max-w-3xl px-5 pb-16 pt-6">
        <style dangerouslySetInnerHTML={{ __html: 'body > header{display:none!important}' }} />
        {step === 'goal' && goal && <section className="lp-goal" dangerouslySetInnerHTML={{ __html: goal }} />}
        {sec && (
          <article className="lp-prose">
            <Blocks blocks={sec.blocks} embeds={false} />
          </article>
        )}
        <ClassAgent />
      </main>
    );
  }

  return (
    <main className="lp-root mx-auto max-w-3xl px-4 pb-24 pt-10">
      <Link
        href={mode === 'homework' ? `/learn/${meta.slug}` : '/learn'}
        className="text-sm text-paper-muted transition-colors hover:text-gold"
      >
        {mode === 'homework' ? '← До лекції' : '← Усі уроки'}
      </Link>

      <header className="lp-head">
        {meta.cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={meta.cover} alt="" className="lp-cover" />
        )}
        <p className="lp-kicker">
          {meta.level && <span className="lp-badge">{meta.level}</span>}
          {meta.number != null && <span>урок {meta.number}</span>}
          {mode === 'homework' && <span className="lp-badge lp-badge-hw">домашка</span>}
        </p>
        <h1>
          {meta.icon && <span aria-hidden>{meta.icon} </span>}
          {meta.title}
        </h1>
      </header>

      {mode === 'lecture' && (
        <>
          {goal && <section className="lp-goal" dangerouslySetInnerHTML={{ __html: goal }} />}
          {page.hasHomework && (
            <Link href={`/learn/${meta.slug}/hw`} className="lp-hwlink">
              📝 Домашнє завдання до цієї лекції →
            </Link>
          )}
          {toc.length > 1 && (
            <nav className="lp-toc" aria-label="Зміст">
              {toc.map((t) => (
                <a key={t.id} href={`#${t.id}`}>
                  {t.label}
                </a>
              ))}
            </nav>
          )}
          <article className="lp-prose">
            {lecture.map((s) => (
              <Blocks key={s.id} blocks={s.blocks} />
            ))}
          </article>
        </>
      )}

      {mode === 'homework' && (
        <>
          <article className="lp-prose">
            {homework.map((s) => (
              <Blocks key={s.id} blocks={s.blocks} />
            ))}
          </article>
          {hw && <HomeworkDone slug={meta.slug} assigned={hw.assigned} done={hw.done} />}
        </>
      )}
    </main>
  );
}
