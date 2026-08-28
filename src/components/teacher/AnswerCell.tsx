'use client';

import { useState, useTransition } from 'react';
import type { Exercise } from '@/content/types';
import { MultipleChoice } from '@/components/exercises/MultipleChoice';
import { FillBlank } from '@/components/exercises/FillBlank';
import { Matching } from '@/components/exercises/Matching';
import { MatchingClick } from '@/components/exercises/MatchingClick';
import { OpenText } from '@/components/exercises/OpenText';
import { overrideAnswer } from '@/lib/actions/answers';

export type AnswerCellState = {
  answer: any;
  isCorrect: boolean | null;
  submitted: boolean; // true = реально збережено в БД; false = ще жива чернетка
  editedByTeacher?: boolean;
};

export function formatAnswer(exercise: Exercise, answer: any): string {
  if (!answer) return '—';
  switch (exercise.type) {
    case 'multiple_choice':
    case 'listening':
      return typeof answer.selectedIndex === 'number' ? exercise.options[answer.selectedIndex] ?? '—' : '—';
    case 'fill_blank':
    case 'open_text':
      return answer.text || '—';
    case 'matching': {
      const pairs: Record<string, string> = answer.pairs ?? {};
      return exercise.pairs.map((p) => `${p.left} → ${pairs[p.id] ?? '…'}`).join(' · ') || '—';
    }
  }
}

export function AnswerCell({
  exercise,
  lessonSlug,
  studentId,
  cell,
  label,
  revalidatePath,
  onSaved,
}: {
  exercise: Exercise;
  lessonSlug: string;
  studentId: string;
  cell: AnswerCellState | undefined;
  /** Текст заголовка картки, напр. "Завдання 2" */
  label: string;
  revalidatePath?: string;
  onSaved: (cell: AnswerCellState) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [mcValue, setMcValue] = useState<number | null>(cell?.answer?.selectedIndex ?? null);
  const [textValue, setTextValue] = useState<string>(cell?.answer?.text ?? '');
  const [matchValue, setMatchValue] = useState<Record<string, string>>(cell?.answer?.pairs ?? {});
  const [isPending, startTransition] = useTransition();

  const openEdit = () => {
    setMcValue(cell?.answer?.selectedIndex ?? null);
    setTextValue(cell?.answer?.text ?? '');
    setMatchValue(cell?.answer?.pairs ?? {});
    setEditing(true);
  };

  const save = () => {
    const answer =
      exercise.type === 'multiple_choice' || exercise.type === 'listening'
        ? { selectedIndex: mcValue }
        : exercise.type === 'matching'
          ? { pairs: matchValue }
          : { text: textValue };

    startTransition(async () => {
      const res = await overrideAnswer(lessonSlug, exercise.id, studentId, answer, revalidatePath);
      if (res.ok) {
        onSaved({ answer, isCorrect: res.isCorrect, submitted: true, editedByTeacher: true });
        setEditing(false);
      }
    });
  };

  const statusBadge = () => {
    if (!cell) return <span className="text-xs text-paper-muted">порожньо</span>;
    if (!cell.submitted) return <span className="text-xs text-gold animate-pulse">друкує…</span>;
    if (cell.editedByTeacher) return <span className="text-xs text-gold-dim">виправлено вчителем</span>;
    if (cell.isCorrect === null) return <span className="text-xs text-gold-dim">на перевірці</span>;
    return (
      <span className={`text-xs font-medium ${cell.isCorrect ? 'text-correct' : 'text-incorrect'}`}>
        {cell.isCorrect ? '✓ вірно' : '✕ невірно'}
      </span>
    );
  };

  return (
    <div className="rounded-lg border border-ink-line bg-ink px-4 py-3">
      <div className="mb-1 flex items-center justify-between gap-3">
        <span className="text-xs uppercase tracking-wide text-paper-muted">{label}</span>
        {statusBadge()}
      </div>

      {!editing && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-paper/90">{formatAnswer(exercise, cell?.answer)}</p>
          <button onClick={openEdit} className="shrink-0 text-xs text-gold hover:text-gold-bright">
            Редагувати
          </button>
        </div>
      )}

      {editing && (
        <div className="flex flex-col gap-3">
          {(exercise.type === 'multiple_choice' || exercise.type === 'listening') && (
            <MultipleChoice options={exercise.options} value={mcValue} onChange={setMcValue} />
          )}
          {exercise.type === 'fill_blank' && (
            <FillBlank textWithBlank={exercise.textWithBlank} value={textValue} onChange={setTextValue} />
          )}
          {exercise.type === 'open_text' && (
            <OpenText value={textValue} onChange={setTextValue} sampleAnswer={exercise.sampleAnswer} />
          )}
          {exercise.type === 'matching' && exercise.variant === 'click' && (
            <MatchingClick
              words={exercise.pairs.map((p) => ({ pairId: p.id, label: p.left }))}
              definitions={exercise.pairs.map((p) => ({ pairId: p.id, label: p.right }))}
              value={matchValue}
              onChange={(pairId, definitionLabel) =>
                setMatchValue((prev) => ({ ...prev, [pairId]: definitionLabel }))
              }
            />
          )}
          {exercise.type === 'matching' && exercise.variant !== 'click' && (
            <Matching
              words={exercise.pairs.map((p) => ({ pairId: p.id, label: p.left }))}
              definitions={exercise.pairs.map((p) => ({ pairId: p.id, label: p.right }))}
              value={matchValue}
              onChange={(pairId, definitionLabel) =>
                setMatchValue((prev) => ({ ...prev, [pairId]: definitionLabel }))
              }
            />
          )}
          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={isPending}
              className="rounded-lg bg-gold px-4 py-1.5 text-sm font-medium text-ink hover:bg-gold-bright disabled:opacity-50"
            >
              {isPending ? 'Зберігаю…' : 'Зберегти'}
            </button>
            <button
              onClick={() => setEditing(false)}
              disabled={isPending}
              className="rounded-lg border border-ink-line px-4 py-1.5 text-sm text-paper-muted hover:text-paper"
            >
              Скасувати
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
