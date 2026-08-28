'use client';

import { useState } from 'react';

type Item = { pairId: string; label: string };

type Props = {
  words: Item[]; // ліва колонка (жанри)
  definitions: Item[]; // права колонка (описи)
  value: Record<string, string>; // pairId -> текст опису, лише для вже вірних пар
  onChange: (pairId: string, definitionLabel: string) => void;
  disabled?: boolean;
};

// Клік-клік варіант: клікаєш жанр, клікаєш опис, якщо збіглось — обидва
// "гаснуть" і йдуть у прогрес-плівку зверху; якщо ні — трясуться і скидаються.
// Точна поведінка з gatunki_filmowe_dopasowanie.html.
export function MatchingClick({ words, definitions, value, onChange, disabled }: Props) {
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [selectedDef, setSelectedDef] = useState<string | null>(null);
  const [wrongPair, setWrongPair] = useState<{ w: string; d: string } | null>(null);

  const matchedCount = Object.keys(value).length;

  const attemptMatch = (wordPairId: string, defPairId: string) => {
    if (wordPairId === defPairId) {
      const def = definitions.find((d) => d.pairId === defPairId);
      if (def) onChange(wordPairId, def.label);
      setSelectedWord(null);
      setSelectedDef(null);
    } else {
      setWrongPair({ w: wordPairId, d: defPairId });
      setTimeout(() => {
        setWrongPair(null);
        setSelectedWord(null);
        setSelectedDef(null);
      }, 400);
    }
  };

  const pickWord = (pairId: string) => {
    if (disabled || value[pairId]) return;
    if (selectedDef) attemptMatch(pairId, selectedDef);
    else setSelectedWord(pairId);
  };

  const pickDef = (pairId: string) => {
    if (disabled || value[pairId]) return;
    if (selectedWord) attemptMatch(selectedWord, pairId);
    else setSelectedDef(pairId);
  };

  return (
    <div>
      {/* Плівка прогресу */}
      <div className="mb-5 flex justify-center gap-1.5">
        {words.map((w, i) => (
          <span
            key={w.pairId}
            className={`h-2.5 w-3.5 rounded-sm border transition-colors ${
              i < matchedCount ? 'border-gold bg-gold' : 'border-ink-line bg-ink'
            }`}
            style={i < matchedCount ? { boxShadow: '0 0 10px rgba(226,179,79,0.5)' } : undefined}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-2 font-mono text-[11px] uppercase tracking-wide text-paper-muted">Gatunek</p>
          <div className="flex flex-col gap-2">
            {words.map((w) => {
              const matched = Boolean(value[w.pairId]);
              const selected = selectedWord === w.pairId;
              const wrong = wrongPair?.w === w.pairId;
              return (
                <button
                  key={w.pairId}
                  type="button"
                  onClick={() => pickWord(w.pairId)}
                  disabled={disabled || matched}
                  className={`rounded-lg border px-4 py-3 text-left font-display text-base transition-all ${
                    matched
                      ? 'cursor-default border-correct text-correct opacity-40'
                      : wrong
                        ? 'animate-shake border-incorrect'
                        : selected
                          ? 'border-gold text-gold-bright'
                          : 'border-ink-line bg-ink-raised text-paper hover:border-gold/50'
                  }`}
                >
                  {w.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-2 font-mono text-[11px] uppercase tracking-wide text-paper-muted">Co to znaczy?</p>
          <div className="flex flex-col gap-2">
            {definitions.map((d) => {
              const matched = Boolean(value[d.pairId]);
              const selected = selectedDef === d.pairId;
              const wrong = wrongPair?.d === d.pairId;
              return (
                <button
                  key={d.pairId}
                  type="button"
                  onClick={() => pickDef(d.pairId)}
                  disabled={disabled || matched}
                  className={`rounded-lg border-y border-r border-l-4 px-4 py-3 text-left text-sm leading-snug transition-all ${
                    matched
                      ? 'cursor-default border-correct text-correct opacity-40'
                      : wrong
                        ? 'animate-shake border-incorrect'
                        : selected
                          ? 'border-l-gold border-y-ink-line border-r-ink-line text-paper'
                          : 'border-ink-line bg-ink-raised/60 text-paper-muted hover:border-l-gold-dim hover:text-paper'
                  }`}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <p className="mt-3 font-mono text-xs text-paper-muted">
        Dopasowane: <span className="text-gold">{matchedCount}</span> / {words.length}
      </p>
    </div>
  );
}
