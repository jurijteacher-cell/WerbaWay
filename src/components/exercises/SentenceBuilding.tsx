'use client';

import { useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { answersMatch } from '@/lib/answer-match';
import { Feedback } from './nb-ui';

type Props = {
  words: string[];
  answer: string;
  /** Other correct word orders (Polish word order is often free). */
  accept?: string[];
  disabled?: boolean;
  /** Restored from browser progress: the order the student already got right */
  solved?: string;
  /** Called on every «Sprawdź» (results recording) */
  onCheck?: (given: string, ok: boolean) => void;
};

type Tile = { id: number; word: string };

function shuffled(words: string[]): Tile[] {
  const a = words.map((word, id) => ({ id, word }));
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Rebuild the tile order from a saved sentence (tiles may hold several words). */
function orderFromText(words: string[], text: string): Tile[] | null {
  const pool = words.map((word, id) => ({ id, word }));
  const out: Tile[] = [];
  let rest = text.trim();
  while (rest) {
    const cands = pool
      .filter((t) => rest === t.word || rest.startsWith(`${t.word} `))
      .sort((a, b) => b.word.length - a.word.length);
    const t = cands[0];
    if (!t) return null;
    out.push(t);
    pool.splice(pool.indexOf(t), 1);
    rest = rest.slice(t.word.length).trimStart();
  }
  return pool.length ? null : out;
}

/**
 * «Ułóż zdanie» — tap tiles into the line, tap again to send them back.
 * Rendered only inside embeds (light notebook theme).
 * Use ONLY `nb-*` classes / `--nb-*` variables here — never the dark site tokens
 * (`text-paper`, `bg-ink*`, `border-ink-line`, `text-gold`…): on notebook paper
 * they turn into cream text on white tiles (invisible). See docs/STYLE_NOTEBOOK.md.
 */
export function SentenceBuilding({ words, answer, accept, disabled, solved, onCheck }: Props) {
  // shuffle after mount: random order on the server would break hydration
  const [remaining, setRemaining] = useState<Tile[]>(() => words.map((word, id) => ({ id, word })));
  const [picked, setPicked] = useState<Tile[]>([]);
  const [checked, setChecked] = useState<boolean | null>(null);

  useEffect(() => {
    if (solved) {
      const order = orderFromText(words, solved);
      if (order) {
        setPicked(order);
        setRemaining([]);
        setChecked(true);
        return;
      }
    }
    setRemaining(shuffled(words));
    setPicked([]);
    setChecked(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [words, solved]);

  const locked = disabled || checked === true;

  const take = (t: Tile) => {
    if (locked) return;
    setChecked(null);
    setRemaining((r) => r.filter((x) => x.id !== t.id));
    setPicked((p) => [...p, t]);
  };
  const giveBack = (t: Tile) => {
    if (locked) return;
    setChecked(null);
    setPicked((p) => p.filter((x) => x.id !== t.id));
    setRemaining((r) => [...r, t]);
  };

  const check = () => {
    const given = picked.map((t) => t.word).join(' ');
    const ok = answersMatch(given, answer, accept).ok;
    setChecked(ok);
    onCheck?.(given, ok);
  };

  const reset = () => {
    setPicked([]);
    setRemaining(shuffled(words));
    setChecked(null);
  };

  const lineState = checked === true ? ' ok' : checked === false ? ' no' : '';

  return (
    <div>
      <div className={`nb-build-line${lineState}`} aria-live="polite">
        {picked.length === 0 && <span className="nb-build-ph">Kliknij słowa w dobrej kolejności…</span>}
        {picked.map((t) => (
          <button
            key={`p-${t.id}`}
            type="button"
            onClick={() => giveBack(t)}
            disabled={locked}
            className={`nb-chip${checked === true ? ' ok' : ' sel'}`}
          >
            {t.word}
          </button>
        ))}
      </div>
      {remaining.length > 0 ? (
        <div className="nb-build-bank">
          {remaining.map((t) => (
            <button key={`r-${t.id}`} type="button" onClick={() => take(t)} className="nb-chip">
              {t.word}
            </button>
          ))}
        </div>
      ) : null}
      {checked !== true && picked.length > 0 ? (
        <div className="nb-row">
          {remaining.length === 0 && checked !== false ? (
            <button type="button" onClick={check} className="nb-btn sm nb-appear">
              Sprawdź
            </button>
          ) : null}
          {picked.length > 0 ? (
            <button type="button" onClick={reset} className="nb-btn ghost sm" title="Od nowa">
              <RotateCcw aria-hidden /> Od nowa
            </button>
          ) : null}
        </div>
      ) : null}
      {checked === false ? (
        <Feedback kind="no">Kolejność nie jest dobra. Kliknij słowo w linijce, żeby je cofnąć.</Feedback>
      ) : null}
    </div>
  );
}
