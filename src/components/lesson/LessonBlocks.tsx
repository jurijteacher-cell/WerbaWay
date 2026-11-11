import type { BookPage, PageBlock } from '@/lib/pages/pages';
import { EmbedFrame } from './EmbedFrame';

/** embeds: 'all' | 'none' | 'external' (у кроці класу вправа відкривається окремо, зовнішні вікна лишаються в тексті) */
export function Blocks({ blocks, embeds = 'all' }: { blocks: PageBlock[]; embeds?: 'all' | 'none' | 'external' }) {
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

/** Вміст однієї сторінки блокнота: шапка розділу + текст/вправа */
export function SheetBody({
  page,
  index,
  total,
  embeds = 'all',
}: {
  page: BookPage;
  index: number;
  total: number;
  embeds?: 'all' | 'none' | 'external';
}) {
  const isExercise = page.kind !== 'text' && page.kind !== 'goal';
  return (
    <>
      <header className="lp-sheet-head">
        {page.num ? (
          <span className="lp-num" aria-hidden="true">
            {page.num}
          </span>
        ) : (
          <span className="lp-num lp-num-soft" aria-hidden="true">
            {page.kind === 'goal' ? '🎯' : '§'}
          </span>
        )}
        <div className="lp-sheet-titles">
          <h2>{page.section}</h2>
          {isExercise && <p className="lp-sheet-sub">{page.label}</p>}
        </div>
        <span className="lp-sheet-folio">
          {index + 1} / {total}
        </span>
      </header>
      <div className={page.kind === 'goal' ? 'lp-prose lp-goal-page' : 'lp-prose'}>
        <Blocks blocks={page.blocks} embeds={embeds} />
      </div>
    </>
  );
}
