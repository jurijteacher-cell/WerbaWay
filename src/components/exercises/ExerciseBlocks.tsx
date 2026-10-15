'use client';

import { useMemo, useState } from 'react';
import { answersMatch, type ItemState } from '@/lib/answer-match';
import { AudioCassette } from './AudioCassette';

export type BlockItem = {
  id: string;
  text?: string;
  prompt?: string;
  statement?: string;
  question?: string;
  left?: string;
  right?: string;
  answer?: string | boolean;
  options?: string[];
  explanation?: string;
  accept?: string[];
  audio_id?: string;
  dialogue?: { speaker?: string; voice?: string; line?: string }[];
};

export type ExerciseBlock = {
  block_id: string;
  exercise_type: string;
  title: string;
  instruction?: string;
  items: BlockItem[];
  bank?: string[];
  max_plays?: number;
  audio_mode?: string;
  audio_url?: string;
};

type Props = {
  title?: string;
  instruction?: string;
  eyebrow?: string;
  blocks: ExerciseBlock[];
  /** Filter to these block_ids */
  blockIds?: string[];
  /** Resolve audio_id → url */
  audioSrc?: (id: string) => string | undefined;
};

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

function blankParts(text: string) {
  const idx = text.indexOf('___');
  if (idx < 0) return { before: text, after: '' };
  return { before: text.slice(0, idx), after: text.slice(idx + 3) };
}

export function ExerciseBlocks({
  title,
  instruction,
  eyebrow = 'ćwiczenia',
  blocks: allBlocks,
  blockIds,
  audioSrc,
}: Props) {
  const blocks = useMemo(() => {
    if (!blockIds?.length) return allBlocks;
    const set = new Set(blockIds);
    return allBlocks.filter((b) => set.has(b.block_id));
  }, [allBlocks, blockIds]);

  const [active, setActive] = useState(blocks[0]?.block_id ?? '');
  const [states, setStates] = useState<Record<string, ItemState>>({});
  const [values, setValues] = useState<Record<string, string>>({});
  const [fails, setFails] = useState<Record<string, number>>({});
  const [showAns, setShowAns] = useState<Record<string, boolean>>({});
  const [matchLeft, setMatchLeft] = useState<string | null>(null);
  const [bankSelected, setBankSelected] = useState<string | null>(null);
  const [slotFilled, setSlotFilled] = useState<Record<string, string>>({});
  const [usedWords, setUsedWords] = useState<Record<string, boolean>>({});

  const setState = (id: string, state: ItemState) =>
    setStates((s) => ({ ...s, [id]: state }));

  const checkText = (item: BlockItem, given: string) => {
    const expected = String(item.answer ?? '');
    const result = answersMatch(given, expected, item.accept);
    setState(item.id, result.state);
    if (!result.ok) {
      setFails((f) => {
        const n = (f[item.id] ?? 0) + 1;
        if (n >= 2) setShowAns((sa) => ({ ...sa, [item.id]: true }));
        return { ...f, [item.id]: n };
      });
    }
    return result;
  };

  if (!blocks.length) return null;

  return (
    <div>
      {title ? (
        <header className="nb-head">
          <p className="nb-eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          {instruction ? <p>{instruction}</p> : null}
        </header>
      ) : null}

      {blocks.length > 1 ? (
        <div className="nb-idx" role="tablist">
          {blocks.map((b) => (
            <button
              key={b.block_id}
              type="button"
              role="tab"
              data-role="tab"
              data-target-block={b.block_id}
              aria-selected={active === b.block_id}
              onClick={() => setActive(b.block_id)}
            >
              {b.block_id}
            </button>
          ))}
        </div>
      ) : null}

      {blocks.map((block) => {
        const visible = blocks.length === 1 || active === block.block_id;
        const rights = shuffle(
          block.items.map((it) => String(it.right ?? it.answer ?? '')),
          `r-${block.block_id}`
        );

        return (
          <section
            key={block.block_id}
            data-block-id={block.block_id}
            style={{ display: visible ? undefined : 'none' }}
          >
            <div className="nb-tape" style={{ marginBottom: 10 }}>
              {block.title}
            </div>
            {block.instruction ? <p className="nb-note">{block.instruction}</p> : null}

            {/* matching */}
            {block.exercise_type === 'matching' && (
              <div className="nb-panel">
                <div className="nb-row" style={{ alignItems: 'flex-start', marginTop: 0 }}>
                  <div style={{ flex: 1, display: 'grid', gap: 8 }}>
                    {block.items.map((item) => {
                      const st = states[item.id] ?? 'idle';
                      return (
                        <div key={item.id} data-item-id={item.id} data-state={st}>
                          <button
                            type="button"
                            className={`nb-chip${matchLeft === item.id ? ' sel' : ''}${
                              st.startsWith('correct') ? ' ok' : ''
                            }${st === 'wrong' ? ' no' : ''}`}
                            data-role="match-left"
                            data-value={item.left}
                            onClick={() => setMatchLeft(item.id)}
                          >
                            {item.left}
                            {values[item.id] ? ` → ${values[item.id]}` : ''}
                          </button>
                          {item.explanation && st.startsWith('correct') ? (
                            <p className="nb-note" data-role="explanation">
                              ↳ {item.explanation}
                            </p>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ flex: 1, display: 'grid', gap: 8 }}>
                    {rights.map((right) => (
                      <button
                        key={right}
                        type="button"
                        className="nb-chip"
                        data-role="match-right"
                        data-value={right}
                        onClick={() => {
                          if (!matchLeft) return;
                          const item = block.items.find((it) => it.id === matchLeft);
                          if (!item) return;
                          const ok = String(item.right ?? item.answer) === right;
                          setValues((v) => ({ ...v, [item.id]: right }));
                          setState(item.id, ok ? 'correct' : 'wrong');
                          setMatchLeft(null);
                        }}
                      >
                        {right}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* drag-and-drop */}
            {block.exercise_type === 'drag-and-drop' && (
              <div>
                <div className="nb-row" style={{ flexWrap: 'wrap', marginBottom: 12 }}>
                  {(block.bank ?? []).map((word, wi) => (
                    <button
                      key={`${word}-${wi}`}
                      type="button"
                      className={`nb-chip${bankSelected === word && !usedWords[`${word}-${wi}`] ? ' sel' : ''}`}
                      data-role="bank-word"
                      data-value={word}
                      data-used={usedWords[word] ? 'true' : 'false'}
                      style={usedWords[word] ? { opacity: 0.35 } : undefined}
                      onClick={() => {
                        if (usedWords[word]) return;
                        setBankSelected(word);
                      }}
                    >
                      {word}
                    </button>
                  ))}
                </div>
                {block.items.map((item) => {
                  const st = states[item.id] ?? 'idle';
                  const { before, after } = blankParts(item.text ?? '');
                  const filled = slotFilled[item.id];
                  return (
                    <div
                      key={item.id}
                      className="nb-panel"
                      data-item-id={item.id}
                      data-state={st}
                    >
                      <p style={{ margin: 0 }}>
                        {before}
                        <button
                          type="button"
                          className={`nb-blank${st.startsWith('correct') ? ' ok' : ''}${
                            st === 'wrong' ? ' no' : ''
                          }`}
                          data-role="slot"
                          onClick={() => {
                            if (!bankSelected) return;
                            const word = bankSelected;
                            setSlotFilled((s) => ({ ...s, [item.id]: word }));
                            setUsedWords((u) => ({ ...u, [word]: true }));
                            setBankSelected(null);
                            const ok = word === String(item.answer);
                            setState(item.id, ok ? 'correct' : 'wrong');
                          }}
                        >
                          {filled ?? '___'}
                        </button>
                        {after}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* fill-in-blank / sentence-building / true-false / multiple-choice */}
            {(block.exercise_type === 'fill-in-blank' ||
              block.exercise_type === 'sentence-building' ||
              block.exercise_type === 'true-false' ||
              block.exercise_type === 'multiple-choice') &&
              block.items.map((item) => {
                const st = states[item.id] ?? 'idle';
                const isTF = block.exercise_type === 'true-false';
                const isMC = block.exercise_type === 'multiple-choice';
                const isSB = block.exercise_type === 'sentence-building';
                const hasOptions = !!(item.options?.length) && !isTF && !isMC;
                const prompt =
                  item.prompt ??
                  item.text ??
                  item.statement ??
                  item.question ??
                  '';
                const expectedStr =
                  typeof item.answer === 'boolean'
                    ? String(item.answer)
                    : String(item.answer ?? '');
                const audioId = item.audio_id;
                const perItemAudio =
                  block.audio_mode === 'per-item' && audioId
                    ? audioSrc?.(audioId)
                    : undefined;

                return (
                  <div
                    key={item.id}
                    className="nb-panel"
                    data-item-id={item.id}
                    data-state={st}
                  >
                    {perItemAudio != null || (block.audio_mode === 'per-item' && audioId) ? (
                      <AudioCassette
                        src={perItemAudio ?? `/audio/${audioId}.mp3`}
                        maxPlays={block.max_plays}
                        defaultSpeed={0.85}
                      />
                    ) : null}

                    {isSB ? (
                      <p className="nb-sb-source">{prompt}</p>
                    ) : (
                      <p style={{ margin: '0 0 8px' }}>{prompt}</p>
                    )}

                    {isTF ? (
                      <div className="nb-tf-row">
                        {(['true', 'false'] as const).map((v) => (
                          <button
                            key={v}
                            type="button"
                            className={`nb-tf${values[item.id] === v ? ' sel' : ''}${
                              st.startsWith('correct') && values[item.id] === v ? ' ok' : ''
                            }${st === 'wrong' && values[item.id] === v ? ' no' : ''}`}
                            data-role="tf"
                            data-value={v}
                            onClick={() => {
                              setValues((val) => ({ ...val, [item.id]: v }));
                              const ok = v === expectedStr;
                              setState(item.id, ok ? 'correct' : 'wrong');
                            }}
                          >
                            {v === 'true' ? 'P' : 'F'}
                          </button>
                        ))}
                      </div>
                    ) : null}

                    {isMC && item.options ? (
                      <div className="nb-mc">
                        {item.options.map((opt) => {
                          const selected = values[item.id] === opt;
                          const wrongFaded =
                            st.startsWith('correct') && opt !== expectedStr;
                          return (
                            <button
                              key={opt}
                              type="button"
                              className={`nb-chip nb-mc-opt${selected ? ' sel' : ''}${
                                selected && st.startsWith('correct') ? ' ok' : ''
                              }${selected && st === 'wrong' ? ' no' : ''}`}
                              style={wrongFaded ? { opacity: 0.45 } : undefined}
                              data-role="option"
                              data-value={opt}
                              onClick={() => {
                                setValues((val) => ({ ...val, [item.id]: opt }));
                                const ok = opt === expectedStr;
                                setState(item.id, ok ? 'correct' : 'wrong');
                              }}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    ) : null}

                    {hasOptions && item.options ? (
                      <div className="nb-row" style={{ marginTop: 0, marginBottom: 8 }}>
                        {item.options.map((opt) => {
                          const selected = values[item.id] === opt;
                          return (
                            <button
                              key={`${item.id}-${opt}`}
                              type="button"
                              className={`nb-chip${selected ? ' sel' : ''}${
                                selected && st.startsWith('correct') ? ' ok' : ''
                              }${selected && st === 'wrong' ? ' no' : ''}`}
                              data-role="option"
                              data-value={opt}
                              onClick={() => {
                                setValues((val) => ({ ...val, [item.id]: opt }));
                                const ok = opt === expectedStr;
                                setState(item.id, ok ? 'correct' : 'wrong');
                              }}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    ) : null}

                    {(isSB || (!hasOptions && !isTF && !isMC)) && (
                      <div className="nb-row" style={{ marginTop: isSB ? 8 : 0 }}>
                        <input
                          className={`nb-blank${st.startsWith('correct') ? ' ok' : ''}${
                            st === 'wrong' ? ' no' : ''
                          }`}
                          style={isSB ? { width: '100%', maxWidth: '100%' } : undefined}
                          data-role="answer-input"
                          value={values[item.id] ?? ''}
                          onChange={(e) => {
                            setValues((val) => ({ ...val, [item.id]: e.target.value }));
                            setState(item.id, 'idle');
                          }}
                        />
                        <button
                          type="button"
                          className="nb-btn"
                          data-role="check"
                          onClick={() => checkText(item, values[item.id] ?? '')}
                        >
                          Sprawdź
                        </button>
                        {showAns[item.id] ? (
                          <button
                            type="button"
                            className="nb-btn ghost"
                            onClick={() =>
                              setValues((val) => ({
                                ...val,
                                [item.id]: String(item.answer ?? ''),
                              }))
                            }
                          >
                            Pokaż
                          </button>
                        ) : null}
                      </div>
                    )}

                    {st === 'correct-no-diacritics' ? (
                      <p className="nb-note" data-role="explanation">
                        ↳ z ogonkami: {String(item.answer)}
                      </p>
                    ) : null}

                    {item.explanation &&
                    (st.startsWith('correct') || (st === 'wrong' && (isTF || isMC || hasOptions))) ? (
                      <p className="nb-note" data-role="explanation">
                        ↳ {item.explanation}
                      </p>
                    ) : null}
                  </div>
                );
              })}
          </section>
        );
      })}
    </div>
  );
}
