'use client';

import { useMemo, useState } from 'react';
import type { GrammarPyramidExercise } from '@/content/queue-types';
import { SentenceBuilding } from './SentenceBuilding';

type Props = {
  data: GrammarPyramidExercise;
  /** Optional filter by original block_id stored on level.block_id, or by 1-based level index ids like g1 */
  blockIds?: string[];
};

function normalize(s: string) {
  return s.trim().replace(/\s+/g, ' ').toLowerCase();
}

function stripDiacritics(s: string) {
  return normalize(s)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ł/g, 'l')
    .replace(/ø/g, 'o');
}

function answersMatch(given: string, expected: string, accept?: string[]) {
  const g = normalize(given);
  const pool = [expected, ...(accept ?? [])].map(normalize);
  if (pool.includes(g)) return { ok: true as const, hint: null };
  if (pool.some((a) => stripDiacritics(a) === stripDiacritics(g))) {
    const withMarks = [expected, ...(accept ?? [])].find(
      (a) => stripDiacritics(a) === stripDiacritics(g)
    );
    return { ok: true as const, hint: withMarks ? `↳ z ogonkami: ${withMarks}` : null };
  }
  return { ok: false as const, hint: null };
}

function shuffle<T>(arr: T[], seed: string): T[] {
  const a = [...arr];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  for (let i = a.length - 1; i > 0; i--) {
    h = (h * 1664525 + 1013904223) >>> 0;
    const j = h % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function GrammarPyramid({ data, blockIds }: Props) {
  const levels = useMemo(() => {
    if (!blockIds?.length) return data.levels;
    const set = new Set(blockIds);
    return data.levels.filter((l, i) => {
      const bid = (l as { block_id?: string }).block_id ?? `g${i + 1}`;
      return set.has(bid) || set.has(String(l.level));
    });
  }, [data.levels, blockIds]);

  const [levelIdx, setLevelIdx] = useState(0);
  const [fillAnswers, setFillAnswers] = useState<Record<string, string>>({});
  const [matchLeft, setMatchLeft] = useState<Record<string, string | null>>({});
  const [matchPairs, setMatchPairs] = useState<Record<string, Record<string, string>>>({});
  const [openAnswers, setOpenAnswers] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Record<string, boolean | null>>({});
  const [hints, setHints] = useState<Record<string, string | null>>({});
  const [failCounts, setFailCounts] = useState<Record<string, number>>({});
  const [showAnswer, setShowAnswer] = useState<Record<string, boolean>>({});

  const level = levels[levelIdx];
  if (!level) return null;

  const key = (id: number | string) => `${level.level}-${id}`;

  const applyCheck = (k: string, given: string, expected: string, accept?: string[]) => {
    const result = answersMatch(given, expected, accept);
    setFeedback((f) => ({ ...f, [k]: result.ok }));
    setHints((h) => ({ ...h, [k]: result.hint }));
    if (!result.ok) {
      setFailCounts((c) => {
        const n = (c[k] ?? 0) + 1;
        if (n >= 2) setShowAnswer((s) => ({ ...s, [k]: true }));
        return { ...c, [k]: n };
      });
    }
  };

  const rightsForMatching = useMemo(() => {
    if (level.task_type !== 'matching') return [];
    return shuffle(
      level.items.map((it) => it.answer ?? ''),
      `match-${level.level}`
    );
  }, [level]);

  return (
    <div>
      <header className="nb-head">
        <p className="nb-eyebrow">gramatyka</p>
        <h1>{data.title}</h1>
        {data.instructions ? <p>{data.instructions}</p> : null}
        <p className="nb-note">
          Poziom {level.level}: {level.name.replace(/^\d+[\.\)]\s*/, '')}
        </p>
        {level.instruction ? <p>{level.instruction}</p> : null}
      </header>

      <div className="nb-idx" role="tablist">
        {levels.map((l, i) => {
          const bare = l.name.replace(/^\d+[\.\)]\s*/, '');
          return (
          <button
            key={l.level}
            type="button"
            role="tab"
            aria-selected={i === levelIdx}
            onClick={() => setLevelIdx(i)}
          >
            {l.level}. {bare}
          </button>
          );
        })}
      </div>

      <div>
        {level.task_type === 'matching' && (
          <div className="nb-panel">
            <div className="nb-row" style={{ marginTop: 0, alignItems: 'flex-start' }}>
              <div style={{ flex: 1, display: 'grid', gap: 8 }}>
                {level.items.map((item) => {
                  const k = key(item.id);
                  const paired = matchPairs[String(level.level)]?.[String(item.id)];
                  const selected = matchLeft[String(level.level)] === String(item.id);
                  const ok = paired != null && paired === item.answer;
                  return (
                    <button
                      key={k}
                      type="button"
                      className={`nb-chip${selected ? ' sel' : ''}${ok ? ' ok' : ''}${
                        paired && !ok ? ' no' : ''
                      }`}
                      onClick={() =>
                        setMatchLeft((m) => ({
                          ...m,
                          [String(level.level)]: String(item.id),
                        }))
                      }
                    >
                      {item.prompt}
                      {paired ? ` → ${paired}` : ''}
                    </button>
                  );
                })}
              </div>
              <div style={{ flex: 1, display: 'grid', gap: 8 }}>
                {rightsForMatching.map((right) => {
                  const used = Object.values(matchPairs[String(level.level)] ?? {}).includes(right);
                  return (
                    <button
                      key={right}
                      type="button"
                      className={`nb-chip${used ? ' ok' : ''}`}
                      disabled={used}
                      onClick={() => {
                        const leftId = matchLeft[String(level.level)];
                        if (!leftId) return;
                        const item = level.items.find((it) => String(it.id) === leftId);
                        if (!item) return;
                        const correct = right === item.answer;
                        setMatchPairs((p) => {
                          const cur = { ...(p[String(level.level)] ?? {}) };
                          if (!correct) {
                            // shake: don't connect
                            return p;
                          }
                          cur[leftId] = right;
                          return { ...p, [String(level.level)]: cur };
                        });
                        if (!correct) {
                          const btn = document.activeElement as HTMLElement | null;
                          btn?.classList.add('nb-shake');
                          setTimeout(() => btn?.classList.remove('nb-shake'), 400);
                        }
                        setMatchLeft((m) => ({ ...m, [String(level.level)]: null }));
                      }}
                    >
                      {right}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {(level.task_type === 'fill-in-blank' || level.task_type === 'true-false') &&
          level.items.map((item) => {
            const k = key(item.id);
            const fb = feedback[k];
            const isTF = level.task_type === 'true-false';
            const options = isTF
              ? ['Prawda', 'Fałsz']
              : item.options;
            const expected = isTF
              ? item.answer === 'true' || item.answer === 'Prawda'
                ? 'Prawda'
                : 'Fałsz'
              : String(item.answer ?? '');
            const sentence = item.sentence ?? item.prompt ?? '';
            return (
              <div key={k} className="nb-panel">
                <p style={{ margin: '0 0 8px' }}>{sentence}</p>
                {options?.length ? (
                  <div className="nb-row" style={{ marginTop: 0, marginBottom: 8 }}>
                    {options.map((opt) => {
                      const selected = fillAnswers[k] === opt;
                      const showFb = fb != null && selected;
                      return (
                        <button
                          key={`${k}-${opt}`}
                          type="button"
                          className={`nb-chip${selected ? ' sel' : ''}${
                            showFb && fb ? ' ok' : ''
                          }${showFb && fb === false ? ' no' : ''}`}
                          onClick={() => {
                            setFillAnswers((a) => ({ ...a, [k]: opt }));
                            setFeedback((f) => ({ ...f, [k]: null }));
                            setHints((h) => ({ ...h, [k]: null }));
                          }}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
                <div className="nb-row" style={{ marginTop: 0 }}>
                  {!options?.length && (
                    <input
                      className={`nb-blank${fb === true ? ' ok' : ''}${fb === false ? ' no' : ''}`}
                      value={fillAnswers[k] ?? ''}
                      onChange={(e) => {
                        setFillAnswers((a) => ({ ...a, [k]: e.target.value }));
                        setFeedback((f) => ({ ...f, [k]: null }));
                      }}
                    />
                  )}
                  <button
                    type="button"
                    className="nb-btn"
                    onClick={() =>
                      applyCheck(
                        k,
                        fillAnswers[k] ?? '',
                        expected,
                        (item as { accept?: string[] }).accept
                      )
                    }
                  >
                    Sprawdź
                  </button>
                  {hints[k] ? (
                    <span className="nb-note" style={{ margin: 0 }}>
                      {hints[k]}
                    </span>
                  ) : null}
                  {fb === false && (
                    <span className="nb-note" style={{ margin: 0 }}>
                      {item.explanation ?? (showAnswer[k] ? `↳ ${expected}` : null)}
                    </span>
                  )}
                  {showAnswer[k] && fb !== true ? (
                    <button
                      type="button"
                      className="nb-btn ghost"
                      onClick={() => setFillAnswers((a) => ({ ...a, [k]: expected }))}
                    >
                      Pokaż
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}

        {level.task_type === 'sentence-building' &&
          level.items.map((item) => (
            <div key={key(item.id)} className="nb-panel">
              <SentenceBuilding words={item.words ?? []} answer={item.answer ?? ''} />
            </div>
          ))}

        {(level.task_type === 'open-answer' || level.task_type === 'text-transform') &&
          level.items.map((item) => {
            const k = key(item.id);
            const expected = item.answer_hint ?? item.answer ?? '';
            const fb = feedback[k];
            return (
              <div key={k} className="nb-panel">
                <p style={{ margin: '0 0 8px' }}>{item.prompt}</p>
                <textarea
                  value={openAnswers[k] ?? ''}
                  onChange={(e) => setOpenAnswers((a) => ({ ...a, [k]: e.target.value }))}
                  rows={3}
                  placeholder="Twoja odpowiedź…"
                  style={{
                    width: '100%',
                    font: 'inherit',
                    border: 0,
                    borderBottom: '2px dashed var(--nb-ink-soft)',
                    background: 'rgba(255,255,255,.55)',
                    padding: '6px 4px',
                    color: 'var(--nb-ink)',
                  }}
                />
                {expected && (
                  <div className="nb-row">
                    <button
                      type="button"
                      className="nb-btn"
                      onClick={() =>
                        applyCheck(
                          k,
                          openAnswers[k] ?? '',
                          expected,
                          (item as { accept?: string[] }).accept
                        )
                      }
                    >
                      Sprawdź
                    </button>
                    {fb === true && <span className="nb-score">Dobra robota!</span>}
                    {hints[k] ? (
                      <span className="nb-note" style={{ margin: 0 }}>
                        {hints[k]}
                      </span>
                    ) : null}
                    {fb === false && (
                      <span className="nb-note" style={{ margin: 0 }}>
                        {showAnswer[k] ? `↳ ${expected}` : 'Spróbuj jeszcze raz'}
                      </span>
                    )}
                    {showAnswer[k] && fb !== true ? (
                      <button
                        type="button"
                        className="nb-btn ghost"
                        onClick={() => setShowAnswer((s) => ({ ...s, [k]: true }))}
                      >
                        Pokaż
                      </button>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}
