'use client';

import { useTransition } from 'react';
import { deleteAttempts, setArchived } from '../actions';

export function ArchiveButton({ studentId, archived }: { studentId: string; archived: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!archived && !confirm('Перенести учня в архів? Код перестане працювати, результати залишаться.')) return;
        start(async () => {
          await setArchived(studentId, !archived);
        });
      }}
      className="rounded-lg border border-ink-line px-3 py-1.5 text-sm text-paper-muted hover:border-gold/40 hover:text-gold disabled:opacity-50"
    >
      {archived ? 'Повернути з архіву' : 'В архів'}
    </button>
  );
}

export function DeleteLessonButton({ studentId, lessonId }: { studentId: string; lessonId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm('Видалити всі спроби цього уроку? Це не можна скасувати.')) return;
        start(async () => {
          await deleteAttempts(studentId, lessonId);
        });
      }}
      className="text-xs text-paper-muted underline hover:text-incorrect disabled:opacity-50"
    >
      видалити результати уроку
    </button>
  );
}
