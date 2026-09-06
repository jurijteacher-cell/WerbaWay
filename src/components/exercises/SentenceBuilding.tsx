'use client';

import { useMemo, useState } from 'react';

type Props = {
  words: string[];
  answer: string;
  disabled?: boolean;
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function normalize(s: string) {
  return s.trim().replace(/\s+/g, ' ').replace(/[.!?]$/, '').toLowerCase();
}

export function SentenceBuilding({ words, answer, disabled }: Props) {
  const bank = useMemo(() => shuffle(words), [words]);
  const [picked, setPicked] = useState<string[]>([]);
  const [remaining, setRemaining] = useState<string[]>(bank);
  const [checked, setChecked] = useState<boolean | null>(null);

  const pick = (word: string, fromRemaining: boolean) => {
    if (disabled || checked !== null) return;
    if (fromRemaining) {
      setRemaining((r) => {
        const i = r.indexOf(word);
        if (i < 0) return r;
        const next = [...r];
        next.splice(i, 1);
        return next;
      });
      setPicked((p) => [...p, word]);
    } else {
      setPicked((p) => {
        const i = p.indexOf(word);
        if (i < 0) return p;
        const next = [...p];
        next.splice(i, 1);
        return next;
      });
      setRemaining((r) => [...r, word]);
    }
  };

  const check = () => {
    setChecked(normalize(picked.join(' ')) === normalize(answer));
  };

  const reset = () => {
    setPicked([]);
    setRemaining(shuffle(words));
    setChecked(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex min-h-[48px] flex-wrap gap-2 rounded-lg border border-ink-line bg-ink-soft p-3">
        {picked.length === 0 && <span className="text-sm text-paper-muted">Ułóż zdanie…</span>}
        {picked.map((w, i) => (
          <button
            key={`p-${w}-${i}`}
            type="button"
            onClick={() => pick(w, false)}
            className="rounded-md bg-gold/20 px-2 py-1 text-sm text-gold"
          >
            {w}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {remaining.map((w, i) => (
          <button
            key={`r-${w}-${i}`}
            type="button"
            onClick={() => pick(w, true)}
            className="rounded-md border border-ink-line px-2 py-1 text-sm text-paper"
          >
            {w}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={check}
          disabled={picked.length === 0 || checked !== null}
          className="rounded-lg bg-gold px-3 py-1.5 text-sm font-medium text-ink disabled:opacity-40"
        >
          Sprawdź
        </button>
        <button type="button" onClick={reset} className="rounded-lg border border-ink-line px-3 py-1.5 text-sm">
          Reset
        </button>
        {checked === true && <span className="text-sm text-correct">✓</span>}
        {checked === false && <span className="text-sm text-incorrect">✕ Spróbuj ponownie</span>}
      </div>
    </div>
  );
}
