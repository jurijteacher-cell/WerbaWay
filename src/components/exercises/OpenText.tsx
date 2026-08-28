'use client';

import { useState } from 'react';
import { Lightbulb } from 'lucide-react';

type Props = {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  sampleAnswer?: string;
};

export function OpenText({ placeholder, value, onChange, disabled, sampleAnswer }: Props) {
  const [showSample, setShowSample] = useState(false);

  return (
    <div>
      <textarea
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={4}
        className="w-full resize-none rounded-lg border border-ink-line bg-ink-raised px-4 py-3 text-paper placeholder:text-paper-muted outline-none focus:border-gold disabled:opacity-60"
      />
      {sampleAnswer && !showSample && (
        <button
          type="button"
          onClick={() => setShowSample(true)}
          className="mt-2 inline-flex items-center gap-1.5 text-xs text-paper-muted transition-colors hover:text-gold"
        >
          <Lightbulb size={13} /> Показати приклад відповіді
        </button>
      )}
      {showSample && sampleAnswer && (
        <p className="mt-2 rounded-lg border border-gold/30 bg-gold/5 px-3 py-2 text-sm text-paper-muted">
          <span className="font-medium text-gold">Приклад:</span> {sampleAnswer}
        </p>
      )}
    </div>
  );
}
