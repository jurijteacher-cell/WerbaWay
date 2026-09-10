'use client';

import { useMemo, useState } from 'react';

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
};

export function VocabCards({ title, instructions, items, groups }: Props) {
  const groupList = useMemo(() => {
    if (groups?.length) return groups;
    const seen = new Set<string>();
    for (const it of items) {
      if (it.group) seen.add(it.group);
    }
    return [...seen];
  }, [groups, items]);

  const [group, setGroup] = useState<string | 'all'>(groupList[0] ?? 'all');
  const filtered = useMemo(() => {
    if (group === 'all' || !groupList.length) return items;
    return items.filter((it) => it.group === group);
  }, [items, group, groupList]);

  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const item = filtered[index];

  const selectGroup = (g: string | 'all') => {
    setGroup(g);
    setIndex(0);
    setFlipped(false);
  };

  const go = (next: number) => {
    setFlipped(false);
    setIndex(next);
  };

  if (!item) {
    return (
      <div>
        <header className="nb-head">
          <p className="nb-eyebrow">słownictwo</p>
          <h1>{title}</h1>
        </header>
        <p className="nb-note">Brak kart w tej grupie.</p>
      </div>
    );
  }

  return (
    <div>
      <header className="nb-head">
        <p className="nb-eyebrow">słownictwo</p>
        <h1>{title}</h1>
        {instructions ? <p>{instructions}</p> : null}
      </header>

      {groupList.length > 0 && (
        <div className="nb-idx" role="tablist">
          {groupList.map((g) => (
            <button
              key={g}
              type="button"
              role="tab"
              aria-selected={group === g}
              onClick={() => selectGroup(g)}
            >
              {g}
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        className={`nb-fiche${flipped ? ' flip' : ''}`}
        onClick={() => setFlipped((f) => !f)}
        aria-label={flipped ? 'Pokaż słowo' : 'Pokaż znaczenie'}
      >
        <div className="in">
          <div className="f">
            <div className="term">{item.term}</div>
            {item.part_of_speech ? <div className="pos">{item.part_of_speech}</div> : null}
            <div className="peek">kliknij, żeby odwrócić →</div>
          </div>
          <div className="b">
            {item.translation_uk ? <div className="uk">{item.translation_uk}</div> : null}
            <div>{item.definition}</div>
            <div className="ex">{item.example_sentence}</div>
          </div>
        </div>
      </button>

      <div className="nb-row">
        <button type="button" className="nb-btn ghost" disabled={index === 0} onClick={() => go(index - 1)}>
          Poprzednie
        </button>
        <button
          type="button"
          className="nb-btn"
          disabled={index >= filtered.length - 1}
          onClick={() => go(index + 1)}
        >
          Następne
        </button>
        <span className="nb-score">
          {index + 1} / {filtered.length}
        </span>
      </div>
    </div>
  );
}
