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
  lessonId?: string;
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

  const [group, setGroup] = useState<string | 'all'>('all');
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => {
    if (group === 'all' || !groupList.length) return items;
    return items.filter((it) => it.group === group);
  }, [items, group, groupList]);

  return (
    <div data-block-id="vocab">
      <header className="nb-head">
        <p className="nb-eyebrow">słownictwo</p>
        <h1>{title}</h1>
        {instructions ? <p>{instructions}</p> : null}
      </header>

      {groupList.length > 0 && (
        <div className="nb-idx" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={group === 'all'}
            onClick={() => setGroup('all')}
          >
            wszystkie
          </button>
          {groupList.map((g) => (
            <button
              key={g}
              type="button"
              role="tab"
              aria-selected={group === g}
              onClick={() => setGroup(g)}
            >
              {g}
            </button>
          ))}
        </div>
      )}

      <div className="nb-grid">
        {filtered.map((item, i) => {
          const key = String(item.id);
          const isFlipped = !!flipped[key];
          const colors = ['c-y', 'c-m', 'c-s', 'c-c'] as const;
          return (
            <div
              key={key}
              className={`nb-card ${colors[i % colors.length]}`}
              data-item-id={key}
              data-flipped={isFlipped ? 'true' : 'false'}
            >
              <button
                type="button"
                data-role="flip"
                className="nb-flip-trigger"
                onClick={() => setFlipped((f) => ({ ...f, [key]: !f[key] }))}
              >
                {!isFlipped ? (
                  <>
                    <h3>{item.term}</h3>
                    {item.part_of_speech ? <div className="pos">{item.part_of_speech}</div> : null}
                    <div className="peek">kliknij, żeby odwrócić →</div>
                  </>
                ) : (
                  <>
                    {item.translation_uk ? <div className="uk">{item.translation_uk}</div> : null}
                    <p style={{ margin: 0 }}>{item.definition}</p>
                    <div className="ex">{item.example_sentence}</div>
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
