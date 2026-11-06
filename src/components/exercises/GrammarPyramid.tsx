'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { ArrowLeft, ArrowRight, Check, Eye } from 'lucide-react';
import type { GrammarPyramidExercise, GrammarPyramidItem } from '@/content/queue-types';
import { answersMatch, stripDiacritics } from '@/lib/answer-match';
import { trackAttempt } from '@/lib/embed-tracker';
import { SentenceBuilding } from './SentenceBuilding';
import { SendToTeacher } from './SendToTeacher';
import {
  AlsoCorrect,
  Feedback,
  Key,
  LevelDone,
  PolishKeys,
  Progress,
  TaskTip,
  gapWidth,
  otherAnswers,
  splitGap,
  type TipKind,
} from './nb-ui';

/**
 * Grammar / homework «pyramid»: levels as tabs, items as cards.
 * Embed-only (light notebook theme): nb-* classes / --nb-* vars only. STYLE_NOTEBOOK.md «UI v2».
 */
type Props = {
  data: GrammarPyramidExercise;
  /** Optional filter by original block_id stored on level.block_id, or by 1-based level index ids like g1 */
  blockIds?: string[];
  /** Embedded inside another exercise (grammar board card): no header, no tabs, no «level done» banner. */
  bare?: boolean;
  /** Keep legacy result ids (grammar board) — defaults to `${block_id}:${item.id}`. */
  track?: { blockId: string; itemId: (item: GrammarPyramidItem) => string };
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

function tipFor(l: Level): TipKind {
  switch (l.task_type) {
    case 'matching':
      return 'match';
    case 'sentence-building':
      return 'build';
    case 'true-false':
      return 'true-false';
    case 'fill-in-blank':
      return l.items.some((it) => it.options?.length) ? 'pick' : 'type';
    default:
      return l.items.some((it) => it.answer_hint ?? it.answer) ? 'type-long' : 'write';
  }
}

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

export function GrammarPyramid({ data, blockIds, bare, track }: Props) {
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
  const [also, setAlso] = useState<Record<string, string[]>>({});
  const listRef = useRef<HTMLDivElement>(null);
  /** keys answered correctly — read synchronously when moving focus */
  const doneRef = useRef<Record<string, boolean>>({});
  /** last navigation came from the keyboard → keep the Enter flow going on the next level */
  const kbRef = useRef(false);

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

  useEffect(() => {
    if (!kbRef.current) return;
    const t = window.setTimeout(() => {
      const first = Array.from(listRef.current?.querySelectorAll<HTMLElement>('[data-k]') ?? []).find(
        (f) => !doneRef.current[f.dataset.k ?? '']
      );
      first?.focus({ preventScroll: true });
    }, 450);
    return () => window.clearTimeout(t);
  }, [levelIdx]);

  if (!level) return null;

  const key = (id: number | string) => keyFor(level, id);
  const blockId = level.block_id ?? `g${level.level}`;

  const record = (item: GrammarPyramidItem, given: string, expected: string, ok: boolean | null) =>
    trackAttempt({
      blockId: track?.blockId ?? blockId,
      itemId: track ? track.itemId(item) : `${blockId}:${item.id}`,
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
    if (result.ok) {
      doneRef.current[k] = true;
      setAlso((a) => ({ ...a, [k]: otherAnswers(given, expected, accept) }));
    }
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
    return result.ok;
  };

  /** After a correct answer: next unfinished field of this level, or the «next level» button. */
  const focusNext = (fromK: string) => {
    window.setTimeout(() => {
      const root = listRef.current;
      if (!root) return;
      const fields = Array.from(root.querySelectorAll<HTMLElement>('[data-k]'));
      const i = fields.findIndex((f) => f.dataset.k === fromK);
      const order = [...fields.slice(i + 1), ...fields.slice(0, Math.max(i, 0))];
      const next = bare
        ? fields.slice(i + 1).find((f) => !doneRef.current[f.dataset.k ?? ''])
        : order.find((f) => !doneRef.current[f.dataset.k ?? '']);
      const after = (el: Element) => root.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING && !root.contains(el);
      const later = bare
        ? Array.from(document.querySelectorAll<HTMLElement>('[data-k]')).find(
            (f) => after(f) && f.offsetParent !== null && !f.classList.contains('ok')
          )
        : undefined;
      const target =
        next ?? later ?? document.querySelector<HTMLElement>('.nb-done .nb-btn, .nb-nav .nb-btn.success');
      if (!target) return;
      target.focus({ preventScroll: true });
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 260);
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

  /**
   * One key does everything: Enter checks; Enter on an already-correct field moves on;
   * Enter on an empty field shakes it instead of failing silently.
   */
  const onEnter = (k: string, value: string, check: () => boolean | undefined) => (e: KeyboardEvent<HTMLElement>) => {
    if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing) return;
    e.preventDefault();
    kbRef.current = true;
    const el = e.currentTarget;
    if (doneRef.current[k]) return focusNext(k);
    if (!value.trim()) {
      el.classList.remove('nb-shake');
      void el.offsetWidth;
      el.classList.add('nb-shake');
      return;
    }
    if (check()) focusNext(k);
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
        'Jeszcze nie — popraw i sprawdź jeszcze raz.'
      )}
    </Feedback>
  );

  return (
    <div>
      {bare ? null : (
      <header className="nb-head">
        <p className="nb-eyebrow">{data.eyebrow ?? 'gramatyka'}</p>
        <h1>{data.title}</h1>
        {data.instructions ? <p>{data.instructions}</p> : null}
        {data.instructions_uk ? <p className="nb-instruction-uk">{data.instructions_uk}</p> : null}
      </header>
      )}

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

      <div style={{ margin: '0 0 14px' }}>
          {!single ? (
            <p className="nb-tape" style={{ margin: '0 0 6px' }}>
              {bareName(level.name)}
            </p>
          ) : null}
          {level.instruction ? (
            <p
              style={
                bare
                  ? { margin: 0, fontWeight: 600, fontSize: 15.5 }
                  : { margin: 0, color: 'var(--nb-ink-soft)', fontSize: 15 }
              }
            >
              {level.instruction}
            </p>
          ) : null}
          {level.instruction_uk ? <p className="nb-instruction-uk" style={{ margin: '4px 0 0' }}>{level.instruction_uk}</p> : null}
          {!levelDone && (!level.instruction || ['type', 'type-long', 'build'].includes(tipFor(level))) ? (
            <TaskTip kind={tipFor(level)} />
          ) : null}
        </div>

      <div
        className="nb-list"
        key={level.level}
        ref={listRef}
        onPointerDown={() => {
          kbRef.current = false;
        }}
      >
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
                        const correct = answersMatch(right, String(item.answer ?? ''), item.accept).ok;
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
            const accept = item.accept;
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
                data-k={k}
                enterKeyHint="next"
                onFocus={() => setFocusKey(k)}
                onBlur={() => setFocusKey((f) => (f === k ? null : f))}
                onKeyDown={onEnter(k, value, () => check())}
                onChange={(e) => {
                  doneRef.current[k] = false;
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
                        const alsoOk =
                          fb === true && !sel && answersMatch(opt, expected, accept).ok;
                        return (
                          <button
                            key={`${k}-${opt}`}
                            type="button"
                            className={`nb-chip${sel ? ' sel' : ''}${sel && fb === true ? ' ok' : ''}${sel && fb === false ? ' no' : ''}${
                              alsoOk ? ' alt' : fb === true && !sel ? ' faded' : ''
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
                        <button
                          type="button"
                          className="nb-btn sm nb-appear"
                          onClick={() => {
                            if (check()) focusNext(k);
                          }}
                        >
                          Sprawdź <span className="nb-kbd">Enter</span>
                        </button>
                      ) : null}
                    </div>
                  )}

                  {focusKey === k && fb !== true ? (
                    <PolishKeys
                      hint={
                        value.trim() ? undefined : <>
                          <Key /> sprawdź
                        </>
                      }
                    />
                  ) : null}
                  {fb === true && hints[k] ? <Feedback kind="hint">{hints[k]!.replace(/^↳\s*/, '')}</Feedback> : null}
                  {fb === true && !isTF && !options?.length ? <AlsoCorrect items={also[k] ?? []} /> : null}
                  {fb === true && options?.length && (also[k]?.length ?? 0) > 0 ? (
                    <Feedback kind="info">Tu pasuje więcej niż jedna odpowiedź — zielone są wszystkie poprawne.</Feedback>
                  ) : null}
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
            const check = () => applyCheck(k, value, expected, item.accept, item);
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
                    data-k={expected ? k : undefined}
                    enterKeyHint={expected ? 'next' : 'enter'}
                    onFocus={() => setFocusKey(k)}
                    onBlur={() => setFocusKey((f) => (f === k ? null : f))}
                    onKeyDown={expected ? onEnter(k, value, check) : undefined}
                    onChange={(e) => {
                      doneRef.current[k] = false;
                      setOpenAnswers((a) => ({ ...a, [k]: e.target.value }));
                      setFeedback((f) => ({ ...f, [k]: null }));
                    }}
                  />
                  {focusKey === k && fb !== true ? (
                    <PolishKeys
                      hint={
                        expected && !value.trim() ? (
                          <>
                            <Key /> sprawdź
                          </>
                        ) : undefined
                      }
                    />
                  ) : null}
                  {expected ? (
                    <>
                      {value.trim() && fb !== true ? (
                        <div className="nb-row">
                          <button
                            type="button"
                            className="nb-btn sm nb-appear"
                            onClick={() => {
                              if (check()) focusNext(k);
                            }}
                          >
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
                      {fb === true ? <AlsoCorrect items={also[k] ?? []} /> : null}
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

      {levelDone && !bare ? (
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

