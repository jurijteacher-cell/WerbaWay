'use client';

import { useRef, useState } from 'react';

type Item = { pairId: string; label: string };

type Props = {
  words: Item[];
  definitions: Item[];
  /** pairId -> текст визначення, ЛИШЕ для вже правильно розставлених пар */
  value: Record<string, string>;
  onChange: (pairId: string, definitionLabel: string) => void;
  disabled?: boolean;
};

// Drag&drop на Pointer Events — те саме, що slownictwo_filmowe_przeciagnij.html,
// але без ручного DOM-клонування: React сам перемальовує "плаваючу" фішку.
// Працює однаково мишею й дотиком, на відміну від застарілого HTML5 dragstart/dragend.
export function Matching({ words, definitions, value, onChange, disabled }: Props) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragLabel, setDragLabel] = useState('');
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [overId, setOverId] = useState<string | null>(null);
  const [wrongId, setWrongId] = useState<string | null>(null);
  const offset = useRef({ x: 0, y: 0 });

  const startDrag = (e: React.PointerEvent<HTMLDivElement>, pairId: string, label: string) => {
    if (disabled) return;
    const rect = e.currentTarget.getBoundingClientRect();
    offset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setDragId(pairId);
    setDragLabel(label);
    setPos({ x: e.clientX - offset.current.x, y: e.clientY - offset.current.y });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragId) return;
    setPos({ x: e.clientX - offset.current.x, y: e.clientY - offset.current.y });
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const slot = el?.closest<HTMLElement>('[data-slot-id]');
    setOverId(slot?.dataset.slotId ?? null);
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragId) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const slot = el?.closest<HTMLElement>('[data-slot-id]');
    const targetId = slot?.dataset.slotId;

    if (targetId && targetId === dragId) {
      const def = definitions.find((d) => d.pairId === dragId);
      if (def) onChange(dragId, def.label);
    } else if (targetId) {
      setWrongId(targetId);
      setTimeout(() => setWrongId(null), 400);
    }
    setDragId(null);
    setOverId(null);
  };

  const remainingWords = words.filter((w) => !value[w.pairId]);

  return (
    <div>
      {/* Банк слів для перетягування */}
      <div className="mb-4 flex min-h-[52px] flex-wrap gap-2 rounded-lg border border-dashed border-ink-line bg-ink/40 p-3">
        {remainingWords.length === 0 && <span className="text-sm text-paper-muted">Усі слова розставлені 🎉</span>}
        {remainingWords.map((w) => (
          <div
            key={w.pairId}
            onPointerDown={(e) => startDrag(e, w.pairId, w.label)}
            onPointerMove={onMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            className={`touch-none select-none rounded-lg border border-ink-line bg-ink-raised px-3 py-2 font-display text-sm text-paper transition-opacity ${
              disabled ? 'cursor-not-allowed opacity-50' : 'cursor-grab hover:border-gold/50'
            } ${dragId === w.pairId ? 'opacity-30' : ''}`}
          >
            {w.label}
          </div>
        ))}
      </div>

      {/* Рядки з визначеннями і слотами */}
      <div className="flex flex-col gap-2">
        {definitions.map((d) => {
          const filled = value[d.pairId];
          const placedWord = filled ? words.find((w) => w.pairId === d.pairId)?.label : null;
          return (
            <div
              key={d.pairId}
              data-slot-id={d.pairId}
              className={`flex items-stretch gap-3 rounded-lg border p-3 transition-colors ${
                filled
                  ? 'border-correct bg-correct/10'
                  : wrongId === d.pairId
                    ? 'border-incorrect animate-shake'
                    : overId === d.pairId
                      ? 'border-gold bg-gold/5'
                      : 'border-ink-line bg-ink-raised/40'
              }`}
            >
              <div
                className={`flex w-32 shrink-0 items-center justify-center rounded-md border border-dashed px-2 text-center font-display text-sm ${
                  filled ? 'border-correct text-correct' : 'border-ink-line text-paper-muted'
                }`}
              >
                {placedWord ?? '?'}
              </div>
              <div className="flex flex-1 items-center text-sm text-paper/90">{d.label}</div>
            </div>
          );
        })}
      </div>

      {dragId && (
        <div
          className="pointer-events-none fixed z-50 rounded-lg border border-gold bg-ink-raised px-3 py-2 font-display text-sm text-gold-bright shadow-xl"
          style={{ left: pos.x, top: pos.y }}
        >
          {dragLabel}
        </div>
      )}
    </div>
  );
}
