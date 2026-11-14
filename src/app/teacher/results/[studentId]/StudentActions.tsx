'use client';


import { useT } from '@/i18n/client';
import { useTransition } from 'react';
import { deleteAttempts, setArchived } from '../actions';

export function ArchiveButton({ studentId, archived }: { studentId: string; archived: boolean }) {
  const t = useT();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!archived && !confirm(t("Перенести учня в архів? Код перестане працювати, результати залишаться."))) return;
        start(async () => {
          await setArchived(studentId, !archived);
        });
      }}
      className="ww-btn ww-btn-secondary ww-btn-sm"
    >
      {archived ? t("Повернути з архіву") : t("В архів")}
    </button>
  );
}

export function DeleteLessonButton({ studentId, lessonId }: { studentId: string; lessonId: string }) {
  const t = useT();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm(t("Видалити всі спроби цього уроку? Це не можна скасувати."))) return;
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
