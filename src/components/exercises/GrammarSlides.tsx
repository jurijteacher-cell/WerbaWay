'use client';

import { useMemo, useState } from 'react';

type Side = { head?: string; rule?: string; examples?: string[] };
type Step = { label?: string; text?: string; optional?: string };
type SlideItem = {
  tag?: string;
  pl?: string;
  uk?: string;
  wrong?: string;
  right?: string;
  why?: string;
  rule?: string;
  example?: string;
  text?: string;
};

type Slide = {
  id: string;
  part?: number;
  section?: string;
  kind: string;
  title: string;
  subtitle?: string;
  goal?: string;
  note?: string;
  result?: string;
  columns?: string[];
  rows?: string[][];
  left?: Side;
  right?: Side;
  items?: SlideItem[];
  steps?: Step[];
};

type Props = {
  title: string;
  slides: Slide[];
  part?: number;
};

function highlight(text: string) {
  const parts = text.split(/(\[\[.*?\]\])/g);
  return parts.map((p, i) => {
    const m = p.match(/^\[\[(.*?)\]\]$/);
    if (m) return <strong key={i}>{m[1]}</strong>;
    return <span key={i}>{p}</span>;
  });
}

export function GrammarSlides({ title, slides, part }: Props) {
  const filtered = useMemo(
    () => (part != null ? slides.filter((s) => s.part === part) : slides),
    [slides, part]
  );
  const [idx, setIdx] = useState(0);
  const slide = filtered[idx];
  if (!slide) return <p className="nb-note">Brak slajdów.</p>;

  return (
    <div>
      <header className="nb-head">
        <p className="nb-eyebrow">gramatyka · slajdy</p>
        <h1>{title}</h1>
        <p className="nb-note">
          {idx + 1} / {filtered.length}
          {part != null ? ` · część ${part}` : ''}
        </p>
      </header>

      <div className="nb-panel" style={{ minHeight: 280 }}>
        <div className="nb-tape" style={{ marginBottom: 12 }}>
          {slide.section} · {slide.kind}
        </div>
        <h2 style={{ marginTop: 0 }}>{slide.title}</h2>
        {slide.subtitle ? <p>{slide.subtitle}</p> : null}
        {slide.goal ? <p className="nb-note">{slide.goal}</p> : null}

        {slide.kind === 'compare' && (
          <div className="nb-row" style={{ alignItems: 'stretch' }}>
            {[slide.left, slide.right].map((side, i) =>
              side ? (
                <div key={i} className="nb-panel" style={{ flex: 1, marginBottom: 0 }}>
                  <p style={{ margin: '0 0 6px', fontWeight: 700 }}>{side.head}</p>
                  <p className="nb-note" style={{ marginTop: 0 }}>
                    {side.rule}
                  </p>
                  {(side.examples ?? []).map((ex, j) => (
                    <p key={j} style={{ margin: '6px 0' }}>
                      {highlight(ex)}
                    </p>
                  ))}
                </div>
              ) : null
            )}
          </div>
        )}

        {slide.kind === 'table' && slide.columns && slide.rows && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr>
                  {slide.columns.map((c, i) => (
                    <th
                      key={i}
                      style={{
                        textAlign: 'left',
                        borderBottom: '2px solid var(--nb-edge)',
                        padding: '6px 8px',
                      }}
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {slide.rows.map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => (
                      <td
                        key={j}
                        style={{ borderBottom: '1px solid var(--nb-edge)', padding: '6px 8px' }}
                      >
                        {highlight(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {slide.kind === 'examples' &&
          (slide.items ?? []).map((it, i) => (
            <div key={i} className="nb-panel" style={{ marginBottom: 8 }}>
              {it.tag ? (
                <p className="nb-note" style={{ margin: '0 0 4px' }}>
                  {it.tag}
                </p>
              ) : null}
              <p style={{ margin: 0 }}>{highlight(it.pl ?? '')}</p>
              {it.uk ? <p className="nb-note">{it.uk}</p> : null}
            </div>
          ))}

        {slide.kind === 'traps' &&
          (slide.items ?? []).map((it, i) => (
            <div key={i} className="nb-panel" style={{ marginBottom: 8 }}>
              <p style={{ margin: '0 0 4px' }}>
                <strong>{it.uk}</strong>
              </p>
              <p style={{ margin: '0 0 4px', color: '#c0503c' }}>✗ {it.wrong}</p>
              <p style={{ margin: '0 0 4px', color: '#2e8b62' }}>✓ {highlight(it.right ?? '')}</p>
              {it.why ? <p className="nb-note">{it.why}</p> : null}
            </div>
          ))}

        {slide.kind === 'exceptions' &&
          (slide.items ?? []).map((it, i) => (
            <div key={i} className="nb-panel" style={{ marginBottom: 8 }}>
              <p style={{ margin: '0 0 4px', fontWeight: 700 }}>{it.rule}</p>
              <p style={{ margin: 0 }}>{highlight(it.example ?? '')}</p>
            </div>
          ))}

        {slide.kind === 'steps' && (
          <>
            <ol style={{ paddingLeft: 20 }}>
              {(slide.steps ?? []).map((st, i) => (
                <li key={i} style={{ marginBottom: 8 }}>
                  <strong>{st.label}:</strong> {st.text}
                  {st.optional ? (
                    <span className="nb-note"> ({st.optional})</span>
                  ) : null}
                </li>
              ))}
            </ol>
            {slide.result ? <p>{highlight(slide.result)}</p> : null}
          </>
        )}

        {slide.note ? <p className="nb-note">{slide.note}</p> : null}
      </div>

      <div className="nb-row">
        <button
          type="button"
          className="nb-btn ghost"
          disabled={idx === 0}
          onClick={() => setIdx((i) => Math.max(0, i - 1))}
        >
          ← Poprzedni
        </button>
        <button
          type="button"
          className="nb-btn"
          disabled={idx >= filtered.length - 1}
          onClick={() => setIdx((i) => Math.min(filtered.length - 1, i + 1))}
        >
          Następny →
        </button>
      </div>
    </div>
  );
}
