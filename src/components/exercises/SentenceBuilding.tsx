'use client';

import { useMemo, useState } from 'react';
import { answersMatch } from '@/lib/answer-match';

type Props = {
  words: string[];
  answer: string;
  /** Other correct word orders (Polish word order is often free). */
  accept?: string[];
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

/**
 * Rendered only inside embeds (light notebook theme).
 * Use ONLY `nb-*` classes / `--nb-*` variables here — never the dark site tokens
 * (`text-paper`, `bg-ink*`, `border-ink-line`, `text-gold`…): on notebook paper
 * they turn into cream text on white tiles (invisible). See docs/STYLE_NOTEBOOK.md.
 */
export function SentenceBuilding({ words, answer, accept, disabled }: Props) {
  const bank = useMemo(() => shuffle(words), [words]);
  const [picked, setPicked] = useState<string[]>([]);
  const [remaining, setRemaining] = useState<string[]>(bank);
  const [checked, setChecked] = useState<boolean | null>(null);

  const pick = (word: string, fromRemaining: boolean) => {
    if (disabled || checked === true) return;
    if (checked === false) setChecked(null);
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
    setChecked(answersMatch(picked.join(' '), answer, accept).ok);
  };

  const reset = () => {
    setPicked([]);
    setRemaining(shuffle(words));
    setChecked(null);
  };

  const lineState = checked === true ? ' ok' : checked === false ? ' no' : '';

  return (
    <div>
      <div className={`nb-build-line${lineState}`}>
        {picked.length === 0 && <span className="nb-build-ph">Ułóż zdanie…</span>}
        {picked.map((w, i) => (
          <button
            key={`p-${w}-${i}`}
            type="button"
            onClick={() => pick(w, false)}
            className={`nb-chip sel${checked === true ? ' ok' : ''}`}
          >
            {w}
          </button>
        ))}
      </div>
      <div className="nb-row" style={{ marginTop: 10 }}>
        {remaining.map((w, i) => (
          <button key={`r-${w}-${i}`} type="button" onClick={() => pick(w, true)} className="nb-chip">
            {w}
          </button>
        ))}
      </div>
      <div className="nb-row">
        <button
          type="button"
          onClick={check}
          disabled={picked.length === 0 || checked !== null}
          className="nb-btn"
        >
          Sprawdź
        </button>
        <button type="button" onClick={reset} className="nb-btn ghost">
          Reset
        </button>
        {checked === true && <span className="nb-score">Dobra robota!</span>}
        {checked === false && (
          <span className="nb-note" style={{ margin: 0 }}>
            ✕ Spróbuj ponownie — przesuń kafelki.
          </span>
        )}
      </div>
    </div>
  );
}
