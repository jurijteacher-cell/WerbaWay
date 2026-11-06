'use client';

import { useMemo, useState, type CSSProperties } from 'react';
import { Check, RefreshCw, RotateCcw, Repeat } from 'lucide-react';
import { usePersistentState } from '@/lib/embed-progress';
import { ResetControl, RestoredNote } from './nb-ui';

type Item = {
  id: number | string;
  term: string;
  definition: string;
  example_sentence: string;
  part_of_speech?: string;
  translation_uk?: string;
  group?: string;
};

type Props = {
  title: string;
  instructions?: string;
  items: Item[];
  groups?: string[];
  lessonId?: string;
};

const COLORS = ['c-y', 'c-m', 'c-s', 'c-c'] as const;
type Mark = 'known' | 'again';

/** Vocabulary flashcards: 3D flip, self-rating «znam / powtórzę». Embed-only: nb-* classes. */
export function VocabCards({ title, instructions, items, groups }: Props) {
  const groupList = useMemo(() => {
    if (groups?.length) return groups;
    const seen = new Set<string>();
    for (const it of items) if (it.group) seen.add(it.group);
    return [...seen];
  }, [groups, items]);

  const [group, setGroup] = useState<string | 'all' | 'again'>('all');
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});
  const prog = usePersistentState<{ marks: Record<string, Mark> }>('vocab', { marks: {} });
  const marks = prog.value.marks;
  const setMarks = (fn: (m: Record<string, Mark>) => Record<string, Mark>) =>
    prog.setValue((v) => ({ ...v, marks: fn(v.marks) }));

  const colorOf = useMemo(() => {
    const m: Record<string, string> = {};
    items.forEach((it, i) => {
      const gi = it.group ? groupList.indexOf(it.group) : -1;
      m[String(it.id)] = COLORS[(gi >= 0 ? gi : i) % COLORS.length];
    });
    return m;
  }, [items, groupList]);

  const filtered = useMemo(() => {
    if (group === 'again') return items.filter((it) => marks[String(it.id)] === 'again');
    if (group === 'all' || !groupList.length) return items;
    return items.filter((it) => it.group === group);
  }, [items, group, groupList, marks]);

  const known = Object.values(marks).filter((m) => m === 'known').length;
  const again = Object.values(marks).filter((m) => m === 'again').length;

  const mark = (key: string, m: Mark) => {
    setMarks((s) => {
      const next = { ...s };
      if (next[key] === m) delete next[key];
      else next[key] = m;
      return next;
    });
    setFlipped((f) => ({ ...f, [key]: false }));
  };

  return (
    <div data-block-id="vocab">
      <header className="nb-head">
        <p className="nb-eyebrow">słownictwo</p>
        <h1>{title}</h1>
        {instructions ? <p>{instructions}</p> : null}
      </header>

      <RestoredNote show={prog.restored} onDismiss={prog.dismissRestored} />

      {groupList.length > 0 && (
        <div className="nb-idx" role="tablist">
          <button type="button" role="tab" aria-selected={group === 'all'} onClick={() => setGroup('all')}>
            wszystkie
            <span className="nb-tab-count">{items.length}</span>
          </button>
          {groupList.map((g) => (
            <button key={g} type="button" role="tab" aria-selected={group === g} onClick={() => setGroup(g)}>
              {g}
            </button>
          ))}
          {again > 0 ? (
            <button type="button" role="tab" aria-selected={group === 'again'} onClick={() => setGroup('again')}>
              <Repeat size={14} aria-hidden /> do powtórki
              <span className="nb-tab-count">{again}</span>
            </button>
          ) : null}
        </div>
      )}

      <div className="nb-deck-bar">
        <div className="nb-progress-track" aria-hidden>
          <div className="nb-progress-fill" style={{ width: `${(known / Math.max(1, items.length)) * 100}%` }} />
        </div>
        <span>
          znam <b style={{ color: 'var(--nb-ink)' }}>{known}</b> z {items.length}
          {again ? ` · do powtórki: ${again}` : ''}
        </span>
        {known + again > 0 ? (
          <ResetControl
            label="Wyczyść oceny"
            onResetAll={() => {
              prog.reset();
              setFlipped({});
              setGroup('all');
            }}
          />
        ) : null}
        {Object.keys(flipped).some((k) => flipped[k]) ? (
          <button type="button" className="nb-btn ghost sm" onClick={() => setFlipped({})}>
            <RotateCcw aria-hidden /> Odwróć wszystkie
          </button>
        ) : null}
      </div>

      <div className="nb-grid" key={group}>
        {filtered.map((item, i) => {
          const key = String(item.id);
          const isFlipped = !!flipped[key];
          const m = marks[key];
          const flip = () => setFlipped((f) => ({ ...f, [key]: !f[key] }));
          return (
            <div
              key={key}
              className={`nb-flip fixed ${colorOf[key]}`}
              data-item-id={key}
              data-flipped={isFlipped ? 'true' : 'false'}
              style={{ '--i': i } as CSSProperties}
            >
              <div className="nb-flip-in">
                <button
                  type="button"
                  data-role="flip"
                  className="nb-face front"
                  aria-hidden={isFlipped}
                  tabIndex={isFlipped ? -1 : 0}
                  onClick={flip}
                >
                  {m ? (
                    <span className={`nb-known${m === 'again' ? ' again' : ''}`} aria-label={m === 'known' ? 'znam' : 'do powtórki'}>
                      {m === 'known' ? <Check strokeWidth={3} /> : <Repeat strokeWidth={2.6} />}
                    </span>
                  ) : null}
                  <span className="term">{item.term}</span>
                  {item.part_of_speech ? <span className="pos">{item.part_of_speech}</span> : null}
                  <span className="peek">
                    <RefreshCw aria-hidden /> odwróć
                  </span>
                </button>
                <div className="nb-face back" aria-hidden={!isFlipped} onClick={flip}>
                  {item.translation_uk ? <div className="uk">{item.translation_uk}</div> : null}
                  <p className="def">{item.definition}</p>
                  {item.example_sentence ? <div className="ex">{item.example_sentence}</div> : null}
                  <div className="nb-rate" style={{ marginTop: 'auto', paddingTop: 10 }} onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="yes"
                      tabIndex={isFlipped ? 0 : -1}
                      aria-pressed={m === 'known'}
                      onClick={() => mark(key, 'known')}
                    >
                      <Check aria-hidden strokeWidth={3} /> znam
                    </button>
                    <button
                      type="button"
                      className="no"
                      tabIndex={isFlipped ? 0 : -1}
                      aria-pressed={m === 'again'}
                      onClick={() => mark(key, 'again')}
                    >
                      <Repeat aria-hidden /> powtórzę
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
