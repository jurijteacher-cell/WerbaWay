'use client';

import { useState } from 'react';

type Props = {
  goals: string[];
  /** Podsumowanie mode: show self-check button */
  mode?: 'intro' | 'summary';
};

/** У цілях пишуть **жирним** — показуємо жирним, а не зірочками (решту тексту екрануємо) */
function inline(src: string): string {
  const esc = src
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return esc.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '<code>$1</code>');
}

export function GoalsChecklist({ goals, mode = 'intro' }: Props) {
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [reviewed, setReviewed] = useState(false);

  return (
    <div className="nb-goals">
      <p className="nb-goals-title">
        {mode === 'summary' ? 'Sprawdź cele lekcji' : 'Po tej lekcji potrafisz'}
      </p>
      <ul className="nb-goals-list">
        {goals.map((g, i) => (
          <li key={i}>
            <label>
              <input
                type="checkbox"
                checked={!!checked[i]}
                onChange={() => setChecked((c) => ({ ...c, [i]: !c[i] }))}
              />
              <span dangerouslySetInnerHTML={{ __html: inline(g.replace(/^🎯\s*/, '')) }} />
            </label>
          </li>
        ))}
      </ul>
      {mode === 'summary' ? (
        <button
          type="button"
          className="nb-btn"
          onClick={() => setReviewed(true)}
        >
          Sprawdzam się
        </button>
      ) : null}
      {reviewed ? (
        <p className="nb-note" style={{ marginTop: 8 }}>
          Super — zaznacz, co już umiesz, a resztę powtórz w domu.
        </p>
      ) : null}
    </div>
  );
}
