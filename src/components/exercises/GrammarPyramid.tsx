'use client';

import { useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { ArrowLeft, ArrowRight, Check, Eye } from 'lucide-react';
import type { GrammarPyramidExercise, GrammarPyramidItem } from '@/content/queue-types';
import { answersMatch, stripDiacritics } from '@/lib/answer-match';
import { trackAttempt } from '@/lib/embed-tracker';
import { SentenceBuilding } from './SentenceBuilding';
import { SendToTeacher } from './SendToTeacher';
import { Feedback, LevelDone, PolishKeys, Progress, gapWidth, splitGap } from './nb-ui';

/**
 * Grammar / homework «pyramid»: levels as tabs, items as cards.
 * Embed-only (light notebook theme): nb-* classes / --nb-* vars only. STYLE_NOTEBOOK.md «UI v2».
 */
type Props = {
  data: GrammarPyramidExercise;
  /** Optional filter by original block_id stored on level.block_id, or by 1-based level index ids like g1 */
  blockIds?: string[];
};

type Level = GrammarPyramidExercise['levels'][number];

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

const bareName = (name: string) => name.replace(/^\d+[\.\)]\s*/, '');
const hasKey = (l: Level, item: GrammarPyramidItem) =>
  l.task_type === 'open-answer' || l.task_type === 'text-transform'
    ? Boolean(item.answer_hint ?? item.answer)
    : true;

function ItemPhoto({ item }: { item: { image_url?: string; image_alt?: string; image_credit?: string } }) {
  if (!item.image_url) return null;
  return (
    <figure className="nb-item-photo" style={{ margin: '0 0 12px' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={item.image_url}
        alt={item.image_alt ?? ''}
        loading="lazy"
        style={{ display: 'block', maxWidth: '100%', maxHeight: 280, width: 'auto', height: 'auto' }}
      />
      {item.image_credit ? (
        <figcaption style={{ fontSize: 12.5, color: 'var(--nb-ink-faint)', marginTop: 4 }}>{item.image_credit}</figcaption>
      ) : null}
    </figure>
  );
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
  const tabsRef = useRef<HTMLDivElement>(null);
  const [fillAnswers, setFillAnswers] = useState<Record<string, string>>({});
  const [matchLeft, setMatchLeft] = useState<Record<string, string | null>>({});
  const [matchPairs, setMatchPairs] = useState<Record<string, Record<string, string>>>({});
  const [matchWrong, setMatchWrong] = useState<string | null>(null);
  const [openAnswers, setOpenAnswers] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Record<string, boolean | null>>({});
  const [hints, setHints] = useState<Record<string, string | null>>({});
  const [, setFailCounts] = useState<Record<string, number>>({});
  const [showAnswer, setShowAnswer] = useState<Record<string, boolean>>({});
  const [sbOk, setSbOk] = useState<Record<string, boolean>>({});
  const [focusKey, setFocusKey] = useState<string | null>(null);

  const keyFor = (l: Level, id: number | string) => `${l.level}-${id}`;

  /** done / total of checkable items in a level (drives tab badges + progress) */
  const stats = (l: Level) => {
    const items = l.items.filter((it) => hasKey(l, it));
    const total = items.length;
    let done = 0;
    if (l.task_type === 'matching') done = Object.keys(matchPairs[String(l.level)] ?? {}).length;
    else if (l.task_type === 'sentence-building') done = items.filter((it) => sbOk[keyFor(l, it.id)]).length;
    else done = items.filter((it) => feedback[keyFor(l, it.id)] === true).length;
    return { done: Math.min(done, total), total };
  };

  const level = levels[levelIdx];

  const rightsForMatching = useMemo(() => {
    if (!level || level.task_type !== 'matching') return [];
    return shuffle(
      level.items.map((it) => it.answer ?? ''),
      `match-${level.level}`
    );
  }, [level]);

  if (!level) return null;

  const key = (id: number | string) => keyFor(level, id);
  const blockId = level.block_id ?? `g${level.level}`;

  const record = (item: GrammarPyramidItem, given: string, expected: string, ok: boolean | null) =>
    trackAttempt({
      blockId,
      itemId: `${blockId}:${item.id}`,
      itemType: level.task_type,
      grammarPoint: item.grammar_point ?? null,
      prompt: item.sentence ?? item.prompt ?? (item.words ? item.words.join(' / ') : null),
      answer: given,
      expected,
      correct: ok,
    });

  const applyCheck = (
    k: string,
    given: string,
    expected: string,
    accept: string[] | undefined,
    item: GrammarPyramidItem
  ) => {
    if (!given.trim()) return;
    const mode = level.diacritics === 'strict' ? 'strict' : 'lenient';
    const result = answersMatch(given, expected, accept, mode);
    record(item, given, expected, result.ok);
    setFeedback((f) => ({ ...f, [k]: result.ok }));
    const almost =
      !result.ok &&
      [expected, ...(accept ?? [])].some((a) => stripDiacritics(a) === stripDiacritics(given));
    setHints((h) => ({ ...h, [k]: almost ? 'Prawie! Dodaj polskie znaki: ą ć ę ł ń ó ś ź ż.' : result.hint }));
    if (!result.ok) {
      setFailCounts((c) => {
        const n = (c[k] ?? 0) + 1;
        if (n >= 2) setShowAnswer((s) => ({ ...s, [k]: true }));
        return { ...c, [k]: n };
      });
    }
  };

  const single = levels.length <= 1;
  const cur = stats(level);
  const levelDone = cur.total > 0 && cur.done === cur.total;
  const isLast = levelIdx === levels.length - 1;
  const allDone = levels.every((l) => {
    const s = stats(l);
    return s.total === 0 || s.done === s.total;
  });

  const goTo = (i: number) => {
    setLevelIdx(i);
    setFocusKey(null);
    requestAnimationFrame(() => tabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const onEnter = (fn: () => void) => (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      fn();
    }
  };

  /** Number badge on the left of each item card */
  const Num = ({ n, ok }: { n: number; ok: boolean }) => (
    <span className="nb-item-num" aria-hidden>
      {ok ? <Check strokeWidth={3} /> : n}
    </span>
  );

  const wrongNote = (k: string, item: GrammarPyramidItem, expected: string, onShow: () => void) =>
    hints[k] && !showAnswer[k] ? (
      <Feedback kind="hint">{hints[k]}</Feedback>
    ) : (
    <Feedback
      kind="no"
      action={
        showAnswer[k] ? (
          <button type="button" className="nb-btn ghost sm" onClick={onShow}>
            <Eye aria-hidden /> Pokaż
          </button>
        ) : null
      }
    >
      {item.explanation ? (
        item.explanation
      ) : showAnswer[k] ? (
        <>
          Poprawnie: <span className="pl">{expected}</span>
        </>
      ) : (
        'Jeszcze nie. Spróbuj jeszcze raz.'
      )}
    </Feedback>
  );

  return (
    <div>
      <header className="nb-head">
        <p className="nb-eyebrow">{data.eyebrow ?? 'gramatyka'}</p>
        <h1>{data.title}</h1>
        {data.instructions ? <p>{data.instructions}</p> : null}
        {data.instructions_uk ? <p className="nb-instruction-uk">{data.instructions_uk}</p> : null}
      </header>

      {!single ? (
        <>
          <div className="nb-idx" role="tablist" ref={tabsRef} style={{ scrollMarginTop: 12 }}>
            {levels.map((l, i) => {
              const s = stats(l);
              const done = s.total > 0 && s.done === s.total;
              return (
                <button
                  key={l.level}
                  type="button"
                  role="tab"
                  aria-selected={i === levelIdx}
                  onClick={() => goTo(i)}
                >
                  <span className={`nb-tab-badge${done ? ' done' : ''}`}>
                    {done ? <Check size={13} strokeWidth={3.2} /> : l.level}
                  </span>
                  {bareName(l.name)}
                  {!done && s.done > 0 ? (
                    <span className="nb-tab-count">
                      {s.done}/{s.total}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
          <Progress done={cur.done} total={cur.total} />
        </>
      ) : null}

      {!single || level.instruction ? (
        <div style={{ margin: '0 0 14px' }}>
          {!single ? (
            <p className="nb-tape" style={{ margin: '0 0 6px' }}>
              {bareName(level.name)}
            </p>
          ) : null}
          {level.instruction ? (
            <p style={{ margin: 0, color: 'var(--nb-ink-soft)', fontSize: 15 }}>{level.instruction}</p>
          ) : null}
          {level.instruction_uk ? <p className="nb-instruction-uk" style={{ margin: '4px 0 0' }}>{level.instruction_uk}</p> : null}
        </div>
      ) : null}

      <div className="nb-list" key={level.level}>
        {level.task_type === 'matching' && (
          <div className="nb-panel">
            <div className="nb-match">
              <div className="nb-match-col left">
                {level.items.map((item) => {
                  const k = key(item.id);
                  const paired = matchPairs[String(level.level)]?.[String(item.id)];
                  const selected = matchLeft[String(level.level)] === String(item.id);
                  return (
                    <button
                      key={k}
                      type="button"
                      disabled={Boolean(paired)}
                      className={`nb-chip${selected ? ' sel' : ''}${paired ? ' ok' : ''}`}
                      aria-pressed={selected}
                      onClick={() =>
                        setMatchLeft((m) => ({
                          ...m,
                          [String(level.level)]: selected ? null : String(item.id),
                        }))
                      }
                    >
                      {item.prompt}
                      {paired ? <small>{paired}</small> : null}
                    </button>
                  );
                })}
              </div>
              <div className="nb-match-col right">
                {rightsForMatching.map((right) => {
                  const used = Object.values(matchPairs[String(level.level)] ?? {}).includes(right);
                  return (
                    <button
                      key={right}
                      type="button"
                      className={`nb-chip${used ? ' used' : ''}${matchWrong === right ? ' no' : ''}`}
                      disabled={used}
                      onClick={() => {
                        const leftId = matchLeft[String(level.level)];
                        if (!leftId) {
                          setMatchWrong(null);
                          return;
                        }
                        const item = level.items.find((it) => String(it.id) === leftId);
                        if (!item) return;
                        const correct = answersMatch(right, String(item.answer ?? '')).ok;
                        record(item, right, String(item.answer ?? ''), correct);
                        if (correct) {
                          setMatchPairs((p) => ({
                            ...p,
                            [String(level.level)]: { ...(p[String(level.level)] ?? {}), [leftId]: right },
                          }));
                          setMatchLeft((m) => ({ ...m, [String(level.level)]: null }));
                        } else {
                          setMatchWrong(right);
                          setTimeout(() => setMatchWrong((w) => (w === right ? null : w)), 420);
                        }
                      }}
                    >
                      {right}
                    </button>
                  );
                })}
              </div>
            </div>
            {!level.instruction && !matchLeft[String(level.level)] && !levelDone ? (
              <p className="nb-note" style={{ marginTop: 12 }}>
                Najpierw kliknij element po lewej, potem jego parę po prawej.
              </p>
            ) : null}
          </div>
        )}

        {(level.task_type === 'fill-in-blank' || level.task_type === 'true-false') &&
          level.items.map((item, idx) => {
            const k = key(item.id);
            const fb = feedback[k];
            const isTF = level.task_type === 'true-false';
            const expected = isTF
              ? item.answer === 'true' || item.answer === 'Prawda'
                ? 'Prawda'
                : 'Fałsz'
              : String(item.answer ?? '');
            const sentence = item.sentence ?? item.prompt ?? '';
            const options = isTF ? undefined : item.options;
            const gap = splitGap(sentence);
            const value = fillAnswers[k] ?? '';
            const accept = (item as { accept?: string[] }).accept;
            const check = (given = value) => applyCheck(k, given, expected, accept, item);
            const state = fb === true ? ' is-ok' : fb === false ? ' is-no' : '';

            const input = (inline: boolean) => (
              <input
                className={`nb-blank${inline ? ' nb-gap' : ''}${fb === true ? ' ok' : ''}${fb === false ? ' no' : ''}`}
                style={inline ? { width: gapWidth(expected) } : undefined}
                value={value}
                aria-label="Twoja odpowiedź"
                placeholder={inline ? '' : 'Twoja odpowiedź…'}
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                onFocus={() => setFocusKey(k)}
                onBlur={() => setFocusKey((f) => (f === k ? null : f))}
                onKeyDown={onEnter(() => check())}
                onChange={(e) => {
                  setFillAnswers((a) => ({ ...a, [k]: e.target.value }));
                  setFeedback((f) => ({ ...f, [k]: null }));
                  setHints((h) => ({ ...h, [k]: null }));
                }}
              />
            );

            return (
              <div key={k} className={`nb-panel nb-item${state}`} style={{ '--i': idx } as CSSProperties}>
                <Num n={idx + 1} ok={fb === true} />
                <div>
                  <ItemPhoto item={item} />

                  {/* sentence: gap rendered in place when the text has one */}
                  {options?.length && gap ? (
                    <p className="nb-q">
                      {gap.before}
                      <span
                        className={`nb-gap-pick${value ? ' filled' : ''}${fb === true ? ' ok' : ''}${fb === false ? ' no' : ''}`}
                        key={value}
                      >
                        {value || '…'}
                      </span>
                      {gap.after}
                    </p>
                  ) : !options?.length && !isTF && gap ? (
                    <p className="nb-q">
                      {gap.before}
                      {input(true)}
                      {gap.after}
                    </p>
                  ) : (
                    <p className="nb-q">{sentence}</p>
                  )}

                  {isTF ? (
                    <div className="nb-row">
                      <div className="nb-tf-row" role="group" aria-label="Prawda czy fałsz">
                        {['Prawda', 'Fałsz'].map((opt) => {
                          const sel = value === opt;
                          return (
                            <button
                              key={opt}
                              type="button"
                              className={`nb-tf${sel ? ' sel' : ''}${sel && fb === true ? ' ok' : ''}${sel && fb === false ? ' no' : ''}`}
                              aria-pressed={sel}
                              onClick={() => {
                                setFillAnswers((a) => ({ ...a, [k]: opt }));
                                check(opt);
                              }}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : options?.length ? (
                    <div className="nb-opts" style={{ marginTop: 12 }}>
                      {options.map((opt) => {
                        const sel = value === opt;
                        return (
                          <button
                            key={`${k}-${opt}`}
                            type="button"
                            className={`nb-chip${sel ? ' sel' : ''}${sel && fb === true ? ' ok' : ''}${sel && fb === false ? ' no' : ''}${
                              fb === true && !sel ? ' faded' : ''
                            }`}
                            aria-pressed={sel}
                            onClick={() => {
                              setFillAnswers((a) => ({ ...a, [k]: opt }));
                              check(opt);
                            }}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="nb-row" style={{ marginTop: gap ? (value.trim() && fb !== true ? 12 : 0) : 10 }}>
                      {!gap ? input(false) : null}
                      {value.trim() && fb !== true ? (
                        <button type="button" className="nb-btn sm nb-appear" onClick={() => check()}>
                          Sprawdź <span className="nb-kbd">Enter</span>
                        </button>
                      ) : null}
                    </div>
                  )}

                  {focusKey === k && fb !== true ? <PolishKeys /> : null}
                  {fb === true && hints[k] ? <Feedback kind="hint">{hints[k]!.replace(/^↳\s*/, '')}</Feedback> : null}
                  {fb === false
                    ? wrongNote(k, item, expected, () => {
                        setFillAnswers((a) => ({ ...a, [k]: expected }));
                        setFeedback((f) => ({ ...f, [k]: null }));
                      })
                    : null}
                </div>
              </div>
            );
          })}

        {level.task_type === 'sentence-building' &&
          level.items.map((item, idx) => {
            const k = key(item.id);
            return (
              <div
                key={k}
                className={`nb-panel nb-item${sbOk[k] ? ' is-ok' : ''}`}
                style={{ '--i': idx } as CSSProperties}
              >
                <Num n={idx + 1} ok={Boolean(sbOk[k])} />
                <div>
                  {item.prompt ? <p className="nb-sb-source">{item.prompt}</p> : null}
                  <SentenceBuilding
                    words={item.words ?? []}
                    answer={item.answer ?? ''}
                    accept={(item as { accept?: string[] }).accept}
                    onCheck={(given, ok) => {
                      record(item, given, item.answer ?? '', ok);
                      if (ok) setSbOk((s) => ({ ...s, [k]: true }));
                    }}
                  />
                </div>
              </div>
            );
          })}

        {(level.task_type === 'open-answer' || level.task_type === 'text-transform') &&
          level.items.map((item, idx) => {
            const k = key(item.id);
            const expected = item.answer_hint ?? item.answer ?? '';
            const fb = feedback[k];
            const value = openAnswers[k] ?? '';
            const check = () =>
              applyCheck(k, value, expected, (item as { accept?: string[] }).accept, item);
            return (
              <div
                key={k}
                className={`nb-panel nb-item${fb === true ? ' is-ok' : fb === false ? ' is-no' : ''}`}
                style={{ '--i': idx } as CSSProperties}
              >
                <Num n={idx + 1} ok={fb === true} />
                <div>
                  <ItemPhoto item={item} />
                  <p className="nb-q" style={{ marginBottom: 10 }}>
                    {item.prompt}
                  </p>
                  <textarea
                    className={`nb-open${fb === true ? ' ok' : ''}${fb === false ? ' no' : ''}`}
                    value={value}
                    rows={expected ? 1 : 4}
                    style={expected ? { minHeight: 48 } : undefined}
                    placeholder="Twoja odpowiedź…"
                    spellCheck={false}
                    onFocus={() => setFocusKey(k)}
                    onBlur={() => setFocusKey((f) => (f === k ? null : f))}
                    onKeyDown={expected ? onEnter(check) : undefined}
                    onChange={(e) => {
                      setOpenAnswers((a) => ({ ...a, [k]: e.target.value }));
                      setFeedback((f) => ({ ...f, [k]: null }));
                    }}
                  />
                  {focusKey === k && fb !== true ? <PolishKeys /> : null}
                  {expected ? (
                    <>
                      {value.trim() && fb !== true ? (
                        <div className="nb-row">
                          <button type="button" className="nb-btn sm nb-appear" onClick={check}>
                            Sprawdź <span className="nb-kbd">Enter</span>
                          </button>
                        </div>
                      ) : null}
                      {fb === true ? (
                        <Feedback kind="ok">
                          <b>Dobra robota!</b>
                          {hints[k] ? <> {hints[k]!.replace(/^↳\s*/, '')}</> : null}
                        </Feedback>
                      ) : null}
                      {fb === false
                        ? wrongNote(k, item, String(expected), () => {
                            setOpenAnswers((a) => ({ ...a, [k]: String(expected) }));
                            setFeedback((f) => ({ ...f, [k]: null }));
                          })
                        : null}
                    </>
                  ) : (
                    <>
                    <div className="nb-row" style={{ marginTop: 6 }}>
                      <span className="nb-counter">
                        {value.trim() ? value.trim().split(/\s+/).length : 0} słów
                      </span>
                    </div>
                    <SendToTeacher
                      text={value}
                      attempt={{
                        blockId,
                        itemId: `${blockId}:${item.id}`,
                        itemType: level.task_type,
                        grammarPoint: item.grammar_point ?? null,
                        prompt: item.prompt ?? null,
                        expected: null,
                      }}
                    />
                    </>
                  )}
                </div>
              </div>
            );
          })}
      </div>

      {levelDone ? (
        isLast || single ? (
          allDone ? (
            <LevelDone title="Wszystko zrobione!" text="Każde zadanie jest poprawne. Brawo!" />
          ) : (
            <LevelDone
              text="Ten poziom jest gotowy. Zostały jeszcze inne."
              onNext={() => goTo(levels.findIndex((l) => { const s = stats(l); return s.total > 0 && s.done < s.total; }))}
              nextLabel="Do zaległych"
            />
          )
        ) : (
          <LevelDone text={`${cur.total} z ${cur.total} poprawnie.`} onNext={() => goTo(levelIdx + 1)} />
        )
      ) : null}

      {!single ? (
        <div className="nb-nav">
          {levelIdx > 0 ? (
            <button type="button" className="nb-btn ghost" onClick={() => goTo(levelIdx - 1)}>
              <ArrowLeft aria-hidden /> Poprzedni
            </button>
          ) : (
            <span />
          )}
          {!isLast ? (
            <button type="button" className={`nb-btn${levelDone ? ' success' : ' ghost'}`} onClick={() => goTo(levelIdx + 1)}>
              Następny <ArrowRight aria-hidden />
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

