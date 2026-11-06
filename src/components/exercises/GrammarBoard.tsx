'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import type {
  GrammarBoardExercise,
  GrammarBoardTaskItem,
  GrammarPyramidExercise,
  GrammarPyramidItem,
} from '@/content/queue-types';
import { GrammarPyramid } from './GrammarPyramid';
import { clearProgress, loadProgress, saveProgress } from '@/lib/embed-progress';
import { ResetControl, RestoredNote } from './nb-ui';

/**
 * «Tablica gramatyczna»: theory card + its tasks. Tasks run on the same engine as grammar
 * exercises (GrammarPyramid, bare mode) — inline gaps, one Enter, accept[] — UI v2.
 * All cards stay mounted (hidden) so answers survive switching cards.
 */
type Props = { data: GrammarBoardExercise };

function toPyramidItem(it: GrammarBoardTaskItem, type: string): GrammarPyramidItem {
  if (type === 'matching') {
    return { id: it.id, prompt: it.left ?? it.prompt ?? '', answer: String(it.answer ?? it.right ?? ''), accept: it.accept };
  }
  return {
    id: it.id,
    sentence: it.text ?? it.sentence ?? it.prompt,
    prompt: it.prompt ?? it.text ?? it.sentence,
    answer: it.answer == null ? undefined : String(it.answer),
    options: it.options,
    explanation: it.explanation,
    accept: it.accept,
  };
}

const TASK_TYPES = new Set(['fill-in-blank', 'matching', 'true-false', 'sentence-building', 'open-answer', 'text-transform']);

export function GrammarBoard({ data }: Props) {
  const [cardIdx, setCardIdx] = useState(0);
  const [epochs, setEpochs] = useState<Record<string, number>>({});
  const [ready, setReady] = useState(false);
  const [restored, setRestored] = useState(false);

  const cards = useMemo(
    () =>
      data.cards.map((card) => {
        const levels = (card.tasks ?? []).map((task, ti) => {
          const raw = task.exercise_type ?? 'fill-in-blank';
          const type = TASK_TYPES.has(raw) ? raw : 'fill-in-blank'; // multiple-choice → option chips
          return {
            level: ti + 1,
            name: task.instruction ?? '',
            instruction: task.instruction,
            task_type: type,
            block_id: `${card.id}-${task.task_id}`,
            items: (task.items ?? []).map((it) => toPyramidItem(it, type)),
            taskId: task.task_id,
          };
        });
        return { card, levels };
      }),
    [data.cards]
  );

  useEffect(() => {
    const snap = loadProgress<{ cardIdx: number }>('board');
    if (snap && snap.cardIdx > 0 && snap.cardIdx < data.cards.length) {
      setCardIdx(snap.cardIdx);
      setRestored(true);
    }
    const anyTask = cards.some(({ levels }) => levels.some((l) => loadProgress(`pyramid:${l.block_id}`)));
    if (anyTask) setRestored(true);
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (ready) saveProgress('board', { cardIdx });
  }, [ready, cardIdx]);

  const resetCards = (which: number[]) => {
    which.forEach((ci) => cards[ci]?.levels.forEach((l) => clearProgress(`pyramid:${l.block_id}`)));
    setEpochs((e) => {
      const next = { ...e };
      which.forEach((ci) => (next[ci] = (next[ci] ?? 0) + 1));
      return next;
    });
    if (which.length > 1) setCardIdx(0);
    setRestored(false);
  };

  const go = (i: number) => {
    setCardIdx(i);
    requestAnimationFrame(() => document.querySelector('.nb-idx')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  return (
    <div>
      <header className="nb-head">
        <p className="nb-eyebrow">tablica gramatyczna</p>
        <h1>{data.title}</h1>
        {data.instructions ? <p>{data.instructions}</p> : null}
      </header>

      <RestoredNote show={restored} onDismiss={() => setRestored(false)} />

      <div className="nb-idx" role="tablist" style={{ scrollMarginTop: 12 }}>
        {data.cards.map((c, i) => (
          <button key={c.id} type="button" role="tab" aria-selected={i === cardIdx} onClick={() => go(i)}>
            <span className="nb-tab-badge">{c.number ?? i + 1}</span>
            {c.rubric ?? c.section ?? `Karta ${i + 1}`}
          </button>
        ))}
      </div>

      {cards.map(({ card, levels }, ci) => (
        <section key={card.id} hidden={ci !== cardIdx} className="nb-list">
          <article className="nb-panel" style={{ background: 'var(--nb-paper-2)', borderColor: 'transparent' }}>
            {card.section ? (
              <p className="nb-eyebrow" style={{ display: 'flex' }}>
                {card.section}
              </p>
            ) : null}
            {card.rubric ? <p className="nb-tape">{card.rubric}</p> : null}
            {card.lead ? (
              <p className="nb-q" style={{ fontSize: 19, fontWeight: 500, margin: '0 0 8px' }}>
                {card.lead}
              </p>
            ) : null}
            {card.rows?.length ? (
              <ul className="nb-q" style={{ margin: '0 0 8px', paddingLeft: 20, fontSize: 16.5, lineHeight: 1.6 }}>
                {card.rows.map((row) => (
                  <li key={row}>{row}</li>
                ))}
              </ul>
            ) : null}
            {card.sticker ? (
              <p className="nb-fb hint" style={{ margin: '8px 0 0' }}>
                {card.sticker}
              </p>
            ) : null}
          </article>

          {levels.map((lvl) => (
            <div key={`${lvl.block_id}-${epochs[ci] ?? 0}`} style={{ marginTop: 18 }}>
              <GrammarPyramid
                bare
                data={{ lesson_id: data.lesson_id, exercise_type: 'grammar', title: '', levels: [lvl] } as unknown as GrammarPyramidExercise}
                track={{
                  blockId: `karta ${card.number ?? card.id}`,
                  // same ids as the pre-v2 board, so earlier student attempts stay linked
                  itemId: (item) => `${card.id}-${lvl.taskId}-${item.id}`,
                }}
              />
            </div>
          ))}
        </section>
      ))}

      <div className="nb-nav">
        {cardIdx > 0 ? (
          <button type="button" className="nb-btn ghost" onClick={() => go(cardIdx - 1)}>
            <ArrowLeft aria-hidden /> Poprzednia
          </button>
        ) : (
          <span />
        )}
        <div className="nb-nav-mid">
          <ResetControl
            levelLabel="Ta karta"
            allLabel="Cała tablica"
            onResetLevel={() => resetCards([cardIdx])}
            onResetAll={() => resetCards(cards.map((_, i) => i))}
          />
        </div>
        {cardIdx < data.cards.length - 1 ? (
          <button type="button" className="nb-btn success" onClick={() => go(cardIdx + 1)}>
            Następna karta <ArrowRight aria-hidden />
          </button>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}
