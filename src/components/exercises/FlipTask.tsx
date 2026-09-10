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

export function FlipTask({ title, instructions, items }: Props) {
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});

  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-display text-2xl text-gold">{title}</h1>
        {instructions && <p className="mt-1 text-sm text-paper-muted">{instructions}</p>}
      </header>
      <div className="grid gap-4 sm:grid-cols-2">
        {items.map((item) => {
          const key = String(item.id);
          const isBack = flipped[key];
          return (
            <button
              key={key}
              type="button"
              onClick={() => setFlipped((prev) => ({ ...prev, [key]: !prev[key] }))}
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
            </button>
          );
        })}
      </div>
    </div>
  );
}
