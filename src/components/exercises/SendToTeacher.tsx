'use client';

import { useState } from 'react';
import { Check, Send } from 'lucide-react';
import { trackAttempt, type AttemptInput } from '@/lib/embed-tracker';

type Props = {
  text: string;
  /** Free writing has no key: recorded with correct = null for the teacher to read */
  attempt: Omit<AttemptInput, 'answer' | 'correct'>;
};

/** «Wyślij nauczycielowi» under open writing tasks. Embed-only: nb-* classes. */
export function SendToTeacher({ text, attempt }: Props) {
  const [sentText, setSentText] = useState<string | null>(null);
  const trimmed = text.trim();
  const sent = sentText !== null && sentText === trimmed;
  return (
    <div className="nb-row">
      <button
        type="button"
        className={`nb-btn${sent ? ' success' : ''}`}
        disabled={!trimmed || sent}
        onClick={() => {
          trackAttempt({ ...attempt, answer: trimmed, correct: null });
          setSentText(trimmed);
        }}
      >
        {sent ? (
          <>
            <Check aria-hidden /> Wysłane
          </>
        ) : (
          <>
            <Send aria-hidden /> Wyślij nauczycielowi
          </>
        )}
      </button>
      {sent ? <span className="nb-note" style={{ margin: 0 }}>Możesz poprawić i wysłać jeszcze raz.</span> : null}
    </div>
  );
}
