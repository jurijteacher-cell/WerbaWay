'use client';

import { useState, useTransition } from 'react';
import { gradeSubmission } from './actions';

export function GradeForm({ submissionId }: { submissionId: string }) {
  const [feedback, setFeedback] = useState('');
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState<'correct' | 'incorrect' | null>(null);

  const send = (isCorrect: boolean) => {
    startTransition(async () => {
      const res = await gradeSubmission(submissionId, isCorrect, feedback);
      if (res.ok) setDone(isCorrect ? 'correct' : 'incorrect');
    });
  };

  if (done) {
    return (
      <p className={`text-sm font-medium ${done === 'correct' ? 'text-correct' : 'text-incorrect'}`}>
        Перевірено: {done === 'correct' ? 'зараховано' : 'не зараховано'}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <textarea
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        placeholder="Коментар для учня (необовʼязково)"
        rows={2}
        className="w-full resize-none rounded-lg border border-ink-line bg-ink px-3 py-2 text-sm text-paper placeholder:text-paper-muted outline-none focus:border-gold"
      />
      <div className="flex gap-2">
        <button
          onClick={() => send(true)}
          disabled={isPending}
          className="ww-btn ww-btn-success ww-btn-sm"
        >
          Зарахувати
        </button>
        <button
          onClick={() => send(false)}
          disabled={isPending}
          className="ww-btn ww-btn-danger ww-btn-sm"
        >
          Не зарахувати
        </button>
      </div>
    </div>
  );
}
