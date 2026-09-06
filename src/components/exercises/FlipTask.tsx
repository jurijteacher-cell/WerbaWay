'use client';

import { useState } from 'react';

type Item = {
  id: number;
  front_title: string;
  back_scenario: string;
  back_checklist: string[];
};

type Props = {
  title: string;
  items: Item[];
};

export function FlipTask({ title, items }: Props) {
  const [flipped, setFlipped] = useState<Record<number, boolean>>({});

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl text-gold">{title}</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {items.map((item) => {
          const isBack = flipped[item.id];
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setFlipped((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}
              className="min-h-[200px] rounded-xl border border-ink-line bg-ink-raised p-5 text-left transition-colors hover:border-gold"
            >
              {!isBack ? (
                <p className="font-display text-xl text-paper">{item.front_title}</p>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-paper">{item.back_scenario}</p>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-paper-muted">
                    {item.back_checklist.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
              )}
              <span className="mt-4 block text-xs text-gold-dim">
                {isBack ? 'kliknij — tytuł' : 'kliknij — zadanie'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
