'use client';

import { useState } from 'react';

type Item = { id: number; term: string; definition: string; example_sentence: string };

type Props = {
  title: string;
  instructions?: string;
  items: Item[];
};

export function VocabCards({ title, instructions, items }: Props) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const item = items[index];

  if (!item) return null;

  const go = (next: number) => {
    setFlipped(false);
    setIndex(next);
  };

  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-display text-2xl text-gold">{title}</h1>
        {instructions && <p className="mt-1 text-sm text-paper-muted">{instructions}</p>}
        <p className="mt-2 text-xs uppercase tracking-wide text-gold-dim">
          {index + 1} / {items.length}
        </p>
      </header>

      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        className="relative min-h-[220px] w-full rounded-xl border border-ink-line bg-ink-raised p-6 text-left transition-colors hover:border-gold"
      >
        {!flipped ? (
          <p className="font-display text-3xl text-paper">{item.term}</p>
        ) : (
          <div className="space-y-3">
            <p className="text-lg text-paper">{item.definition}</p>
            <p className="border-t border-ink-line pt-3 text-sm italic text-paper-muted">
              {item.example_sentence}
            </p>
          </div>
        )}
        <span className="absolute bottom-3 right-4 text-xs text-gold-dim">
          {flipped ? 'kliknij — słowo' : 'kliknij — znaczenie'}
        </span>
      </button>

      <div className="flex gap-3">
        <button
          type="button"
          disabled={index === 0}
          onClick={() => go(index - 1)}
          className="rounded-lg border border-ink-line px-4 py-2 text-sm disabled:opacity-30"
        >
          Poprzednie
        </button>
        <button
          type="button"
          disabled={index >= items.length - 1}
          onClick={() => go(index + 1)}
          className="rounded-lg bg-gold px-4 py-2 text-sm font-medium text-ink disabled:opacity-30"
        >
          Następne
        </button>
      </div>
    </div>
  );
}
