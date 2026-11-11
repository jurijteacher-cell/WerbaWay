import Link from 'next/link';
import type { ParsedPage } from '@/lib/pages/pages';
import { EmbedFrame } from './EmbedFrame';
import './lesson.css';

export function LessonView({ page }: { page: ParsedPage }) {
  const { meta, goal, blocks, toc } = page;
  return (
    <main className="lp-root mx-auto max-w-3xl px-4 pb-24 pt-10">
      <Link href="/learn" className="text-sm text-paper-muted transition-colors hover:text-gold">
        ← Усі уроки
      </Link>

      <header className="lp-head">
        {meta.cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={meta.cover} alt="" className="lp-cover" />
        )}
        <p className="lp-kicker">
          {meta.level && <span className="lp-badge">{meta.level}</span>}
          {meta.number != null && <span>урок {meta.number}</span>}
        </p>
        <h1>
          {meta.icon && <span aria-hidden>{meta.icon} </span>}
          {meta.title}
        </h1>
      </header>

      {goal && <section className="lp-goal" dangerouslySetInnerHTML={{ __html: goal }} />}

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
        {blocks.map((b, i) => {
          if (b.k === 'html') return <div key={i} dangerouslySetInnerHTML={{ __html: b.html }} />;
          if (b.k === 'embed') return <EmbedFrame key={i} src={b.src} title={b.title} kind={b.kind} />;
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
      </article>
    </main>
  );
}
