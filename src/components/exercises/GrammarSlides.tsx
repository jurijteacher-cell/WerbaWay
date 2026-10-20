'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

type Brick = { text: string; label?: string };
type Side = { title?: string; head?: string; rule?: string; lines?: string[]; examples?: string[] };
type SlideItem = {
  tag?: string;
  pl?: string;
  uk?: string;
  wrong?: string;
  right?: string;
  why?: string;
  text?: string;
  refers_to?: string;
  rule?: string;
  example?: string;
};

export type GrammarSlide = {
  id: string;
  part?: number;
  section?: string;
  kind: string;
  title: string;
  subtitle?: string;
  question?: string;
  goal?: string;
  note?: string;
  teacher_note?: string;
  result?: string;
  headers?: string[];
  columns?: string[];
  rows?: string[][];
  bricks?: Brick[];
  steps?: { label?: string; text?: string }[];
  left?: Side;
  right?: Side;
  items?: SlideItem[];
  reveal?: string;
};

type Props = {
  title: string;
  slides: GrammarSlide[];
  part?: number;
  teacherMode?: boolean;
};

function highlight(text: string): ReactNode {
  const parts = text.split(/(\[\[.*?\]\])/g);
  return parts.map((p, i) => {
    const m = p.match(/^\[\[(.*?)\]\]$/);
    if (m) return <mark key={i} className="nb-mark-hl">{m[1]}</mark>;
    return <span key={i}>{p}</span>;
  });
}

function sectionClass(section?: string) {
  if (section === 'wyjatki') return 'sec-lilac';
  if (section === 'pulapki') return 'sec-coral';
  if (section === 'teoria') return 'sec-sky';
  return '';
}

export function GrammarSlides({ title, slides, part, teacherMode }: Props) {
  const filtered = useMemo(
    () => (part != null ? slides.filter((s) => s.part === part) : slides),
    [slides, part]
  );

  const [idx, setIdx] = useState(0);
  const [step, setStep] = useState(0);

  const slide = filtered[idx];

  const maxStep = useMemo(() => {
    if (!slide) return 0;
    if (slide.kind === 'table') return (slide.rows?.length ?? 0) + (slide.note ? 1 : 0);
    if (slide.kind === 'steps')
      return (slide.bricks?.length ?? slide.steps?.length ?? 0) + (slide.result ? 1 : 0) + (slide.note ? 1 : 0);
    if (slide.kind === 'compare') return 2 + (slide.note ? 1 : 0);
    if (slide.kind === 'examples' || slide.kind === 'exceptions' || slide.kind === 'traps')
      return (slide.items?.length ?? 0) + (slide.note ? 1 : 0);
    return slide.note ? 1 : 0;
  }, [slide]);

  const go = useCallback(
    (dir: 1 | -1) => {
      if (dir === 1) {
        if (step < maxStep) setStep((s) => s + 1);
        else if (idx < filtered.length - 1) {
          setIdx((i) => i + 1);
          setStep(0);
        }
      } else {
        if (step > 0) setStep((s) => s - 1);
        else if (idx > 0) {
          setIdx((i) => i - 1);
          setStep(999);
        }
      }
    },
    [step, maxStep, idx, filtered.length]
  );

  useEffect(() => {
    if (step === 999 && slide) setStep(maxStep);
  }, [step, maxStep, slide]);

  useEffect(() => {
    const onHash = () => {
      const hash = window.location.hash.replace(/^#/, '');
      if (!hash) return;
      const [sid] = hash.split('.');
      const i = filtered.findIndex((s) => s.id === sid);
      if (i >= 0) {
        setIdx(i);
        setStep(0);
      }
    };
    onHash();
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [filtered]);

  useEffect(() => {
    if (slide) {
      const base = `${slide.id}${step > 0 ? `.${step}` : ''}`;
      if (window.location.hash !== `#${base}`) {
        history.replaceState(null, '', `#${base}`);
      }
    }
  }, [slide, step]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        go(1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        go(-1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);

  if (!slide) return <p className="nb-note">Brak slajdów.</p>;

  const rowsVisible =
    slide.kind === 'table' ? Math.min(step, slide.rows?.length ?? 0) : 0;
  const bricksCount = slide.bricks?.length ?? slide.steps?.length ?? 0;
  const bricksVisible =
    slide.kind === 'steps' ? Math.min(step, bricksCount) : 0;
  const showResult = slide.kind === 'steps' && step > bricksCount;
  const itemsVisible =
    slide.kind === 'examples' || slide.kind === 'exceptions' || slide.kind === 'traps'
      ? Math.min(step, slide.items?.length ?? 0)
      : 0;
  const showNote =
    !!slide.note &&
    step >=
      (slide.kind === 'table'
        ? slide.rows?.length ?? 0
        : slide.kind === 'steps'
          ? bricksCount + (slide.result ? 1 : 0)
          : slide.kind === 'compare'
            ? 2
            : slide.items?.length ?? 0);

  return (
    <div className="nb-slides-root">
      <header className="nb-head">
        <p className="nb-eyebrow">
          Werba Way · Gramatyka{part != null ? ` · część ${part}` : ''}
        </p>
        <div className={`nb-sec-pill ${sectionClass(slide.section)}`}>
          {slide.section ?? 'teoria'}
        </div>
        <p className="nb-note">
          {idx + 1} / {filtered.length}
        </p>
      </header>

      <div
        className="nb-slide-stage"
        data-slide-id={slide.id}
        onClick={(e) => {
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          const x = e.clientX - rect.left;
          go(x > rect.width * 0.3 ? 1 : -1);
        }}
      >
        <h2 className="nb-slide-title">
          <span className="nb-slide-num">{idx + 1}</span>
          {slide.title}
        </h2>

        {slide.kind === 'title' && (
          <div className="nb-slide-title-body">
            {slide.question ? <p className="nb-slide-q">{slide.question}</p> : null}
            {slide.goal ? <div className="nb-goals">{slide.goal}</div> : null}
          </div>
        )}

        {slide.kind === 'table' && (
          <table className="nb-slide-table">
            <thead>
              <tr>
                {(slide.headers ?? slide.columns ?? []).map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(slide.rows ?? []).map((row, ri) => (
                <tr
                  key={ri}
                  style={{
                    opacity: ri < rowsVisible ? 1 : 0,
                    transform: ri < rowsVisible ? 'none' : 'translateY(8px)',
                  }}
                >
                  {row.map((cell, ci) => (
                    <td key={ci}>{highlight(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {slide.kind === 'steps' && (
          <div className="nb-slide-steps">
            {(slide.bricks ?? slide.steps?.map((s) => ({ text: s.text ?? '', label: s.label })) ?? []).map(
              (b, i) => (
                <div
                  key={i}
                  className="nb-brick"
                  style={{ opacity: i < bricksVisible ? 1 : 0 }}
                >
                  <span>{highlight(b.text)}</span>
                  {b.label ? <small>{b.label}</small> : null}
                </div>
              )
            )}
            {slide.result && showResult ? (
              <div className="nb-brick-result">{highlight(slide.result)}</div>
            ) : null}
          </div>
        )}

        {slide.kind === 'compare' && (
          <div className="nb-slide-compare">
            <div className="nb-compare-card" style={{ opacity: step >= 1 ? 1 : 0 }}>
              <h3>{slide.left?.title ?? slide.left?.head}</h3>
              {(slide.left?.lines ?? slide.left?.examples ?? []).map((l) => (
                <p key={l}>{highlight(l)}</p>
              ))}
              {slide.left?.rule ? <p>{highlight(slide.left.rule)}</p> : null}
            </div>
            <div className="nb-compare-card mint" style={{ opacity: step >= 2 ? 1 : 0 }}>
              <h3>{slide.right?.title ?? slide.right?.head}</h3>
              {(slide.right?.lines ?? slide.right?.examples ?? []).map((l) => (
                <p key={l}>{highlight(l)}</p>
              ))}
              {slide.right?.rule ? <p>{highlight(slide.right.rule)}</p> : null}
            </div>
          </div>
        )}

        {slide.kind === 'examples' && (
          <div className="nb-slide-examples">
            {(slide.items ?? []).map((it, i) => (
              <div key={i} className="nb-ex-row" style={{ opacity: i < itemsVisible ? 1 : 0 }}>
                {it.tag ? <span className="nb-ex-tag">{it.tag}</span> : null}
                <span className="nb-ex-pl">{highlight(it.pl ?? it.text ?? '')}</span>
                {it.uk ? <span className="nb-ex-uk">{it.uk}</span> : null}
              </div>
            ))}
          </div>
        )}

        {slide.kind === 'exceptions' && (
          <div className="nb-slide-exceptions">
            {(slide.items ?? []).map((it, i) => (
              <div key={i} className="nb-exc" style={{ opacity: i < itemsVisible ? 1 : 0 }}>
                {highlight(it.text ?? '')}
                {it.refers_to ? <small> → {it.refers_to}</small> : null}
              </div>
            ))}
          </div>
        )}

        {slide.kind === 'traps' && (
          <div className="nb-slide-traps">
            {(slide.items ?? []).map((it, i) => {
              const visible = i < itemsVisible;
              const trapStep = visible ? 2 : 0;
              return (
                <div key={i} className="nb-trap" style={{ opacity: visible ? 1 : 0 }}>
                  {it.uk ? <p className="nb-ex-uk">{it.uk}</p> : null}
                  {trapStep >= 1 && it.wrong ? (
                    <p className="nb-trap-wrong">✗ {it.wrong}</p>
                  ) : null}
                  {trapStep >= 2 && it.right ? (
                    <>
                      <p className="nb-trap-right">✓ {highlight(it.right)}</p>
                      {it.why ? <div className="nb-trap-why">Dlaczego? {it.why}</div> : null}
                    </>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}

        {showNote && slide.note ? (
          <div className="nb-slide-note">📌 {slide.note}</div>
        ) : null}
      </div>

      {teacherMode && slide.teacher_note ? (
        <aside className="nb-teacher-note" data-role="teacher-note">
          {slide.teacher_note}
        </aside>
      ) : null}

      <div className="nb-row">
        <button type="button" className="nb-btn ghost" onClick={() => go(-1)}>
          ←
        </button>
        <button type="button" className="nb-btn" onClick={() => go(1)}>
          →
        </button>
        <span className="nb-score">{title}</span>
      </div>
    </div>
  );
}
