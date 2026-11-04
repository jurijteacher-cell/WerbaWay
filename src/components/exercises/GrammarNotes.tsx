import type { ReactNode } from 'react';

/**
 * Konspekt (grammar notes) — static notebook cards, everything visible at once.
 * Data: src/content/queue-published/{lesson_id}-notes.json, served at /embed/{lesson_id}/notes?sec={id}.
 *
 * Inline markup in any string:
 *   [[x]]      — highlight in the section accent colour
 *   {{b|x}}    — case colour: b = biernik, d = dopełniacz, n = narzędnik, m = mianownik
 */

export type NotesTile = { label: string; ending: string; examples: string[]; hint?: string };
export type NotesTrap = { uk: string; wrong: string; right: string; why?: string };
export type NotesCard = {
  kind: 'tiles' | 'table' | 'compare' | 'list' | 'traps' | 'sentences' | 'note';
  title?: string;
  wide?: boolean;
  tiles?: NotesTile[];
  columns?: string[];
  rows?: string[][];
  row_cases?: (string | null)[];
  left?: { head: string; lines: string[] };
  right?: { head: string; lines: string[] };
  items?: string[];
  traps?: NotesTrap[];
  text?: string;
};
export type NotesSection = {
  id: string;
  accent: 'mint' | 'coral' | 'sky' | 'lilac' | 'yellow';
  eyebrow?: string;
  title: string;
  question?: string;
  gloss?: string;
  cards: NotesCard[];
};

function rich(text: string): ReactNode[] {
  const parts = text.split(/(\[\[.*?\]\]|\{\{[bdnm]\|.*?\}\})/g);
  return parts.map((p, i) => {
    const hl = p.match(/^\[\[(.*?)\]\]$/);
    if (hl) return <mark key={i} className="nb-notes-hl">{hl[1]}</mark>;
    const cs = p.match(/^\{\{([bdnm])\|(.*?)\}\}$/);
    if (cs) return <mark key={i} className={`nb-notes-case c-${cs[1]}`}>{cs[2]}</mark>;
    return <span key={i}>{p}</span>;
  });
}

function Card({ card }: { card: NotesCard }) {
  return (
    <section className={`nb-notes-card k-${card.kind}${card.wide ? ' wide' : ''}`}>
      {card.title ? <h3 className="nb-notes-card-title">{rich(card.title)}</h3> : null}

      {card.kind === 'tiles' && (
        <div className="nb-notes-tiles">
          {(card.tiles ?? []).map((t, i) => (
            <div key={i} className="nb-notes-tile">
              <span className="nb-notes-tile-label">{t.label}</span>
              <span className="nb-notes-tile-ending">{rich(t.ending)}</span>
              {t.examples.map((e) => (
                <span key={e} className="nb-notes-tile-ex">
                  {rich(e)}
                </span>
              ))}
              {t.hint ? <span className="nb-notes-tile-hint">{rich(t.hint)}</span> : null}
            </div>
          ))}
        </div>
      )}

      {card.kind === 'table' && (
        <table className="nb-notes-table">
          <thead>
            <tr>
              {(card.columns ?? []).map((c, i) => (
                <th key={i}>{rich(c)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(card.rows ?? []).map((row, ri) => {
              const rc = card.row_cases?.[ri];
              return (
                <tr key={ri} className={rc ? `r-${rc}` : undefined}>
                  {row.map((cell, ci) => (
                    <td key={ci}>{rich(cell)}</td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {card.kind === 'compare' && (
        <div className="nb-notes-compare">
          {[card.left, card.right].map((side, i) =>
            side ? (
              <div key={i} className={`nb-notes-side${i ? ' right' : ''}`}>
                <h4>{rich(side.head)}</h4>
                {side.lines.map((l) => (
                  <p key={l}>{rich(l)}</p>
                ))}
              </div>
            ) : null
          )}
        </div>
      )}

      {card.kind === 'list' && (
        <ul className="nb-notes-list">
          {(card.items ?? []).map((it) => (
            <li key={it}>{rich(it)}</li>
          ))}
        </ul>
      )}

      {card.kind === 'sentences' && (
        <div className="nb-notes-sentences">
          {(card.items ?? []).map((it) => (
            <p key={it}>{rich(it)}</p>
          ))}
          <div className="nb-notes-legend">
            <mark className="nb-notes-case c-b">biernik</mark>
            <mark className="nb-notes-case c-d">dopełniacz</mark>
            <mark className="nb-notes-case c-n">narzędnik</mark>
          </div>
        </div>
      )}

      {card.kind === 'traps' && (
        <div className="nb-notes-traps">
          {(card.traps ?? []).map((t, i) => (
            <div key={i} className="nb-notes-trap">
              <span className="nb-notes-trap-uk">{t.uk}</span>
              <span className="nb-notes-trap-wrong">✗ {t.wrong}</span>
              <span className="nb-notes-trap-right">✓ {rich(t.right)}</span>
              {t.why ? <span className="nb-notes-trap-why">{rich(t.why)}</span> : null}
            </div>
          ))}
        </div>
      )}

      {card.kind === 'note' && card.text ? <p className="nb-notes-sticker">📌 {rich(card.text)}</p> : null}
    </section>
  );
}

export function GrammarNotes({ sections }: { sections: NotesSection[] }) {
  return (
    <div className="nb-notes-root">
      {sections.map((s) => (
        <article key={s.id} className={`nb-notes-section a-${s.accent}`} data-section={s.id}>
          <header className="nb-notes-head">
            {s.eyebrow ? <p className="nb-eyebrow">{s.eyebrow}</p> : null}
            <h2 className="nb-notes-title">
              <span className="nb-notes-tab">{s.title}</span>
              {s.question ? <span className="nb-notes-q">{s.question}</span> : null}
            </h2>
            {s.gloss ? <p className="nb-notes-gloss">{s.gloss}</p> : null}
          </header>
          <div className="nb-notes-grid">
            {s.cards.map((c, i) => (
              <Card key={i} card={c} />
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}
