'use client';

import { useState } from 'react';

type Item = {
  id: number | string;
  front_title: string;
  back_scenario: string;
  back_checklist: string[];
};

type Props = {
  title: string;
  instructions?: string;
  items: Item[];
};

const COLORS = ['c-y', 'c-m', 'c-s', 'c-c'] as const;

export function FlipTask({ title, instructions, items }: Props) {
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});

  return (
    <div>
      <header className="nb-head">
        <p className="nb-eyebrow">zadania komunikacyjne</p>
        <h1>{title}</h1>
        {instructions ? <p>{instructions}</p> : null}
      </header>

      <div className="nb-grid">
        {items.map((item, i) => {
          const key = String(item.id);
          const isBack = flipped[key];
          return (
            <button
              key={key}
              type="button"
              className={`nb-card ${COLORS[i % COLORS.length]}`}
              onClick={() => setFlipped((prev) => ({ ...prev, [key]: !prev[key] }))}
            >
              {!isBack ? (
                <>
                  <h3>{item.front_title}</h3>
                  <div className="peek">kliknij, żeby odwrócić →</div>
                </>
              ) : (
                <>
                  <p style={{ margin: 0 }}>{item.back_scenario}</p>
                  <ul>
                    {item.back_checklist.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
