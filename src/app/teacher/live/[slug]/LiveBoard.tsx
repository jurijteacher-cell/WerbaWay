'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Exercise, Lesson } from '@/content/types';
import { MultipleChoice } from '@/components/exercises/MultipleChoice';
import { FillBlank } from '@/components/exercises/FillBlank';
import { Matching } from '@/components/exercises/Matching';
import { OpenText } from '@/components/exercises/OpenText';
import { overrideAnswer } from './actions';

type Cell = {
  answer: any;
  isCorrect: boolean | null;
  submitted: boolean; // true = реально збережено в БД; false = ще жива чернетка
  editedByTeacher?: boolean;
};

type StudentRow = {
  studentId: string;
  studentName: string;
  cells: Record<string, Cell>; // exerciseId -> Cell
};

type InitialSubmission = {
  student_id: string;
  exercise_id: string;
  answer: any;
  is_correct: boolean | null;
  auto_graded: boolean;
  edited_by_teacher: boolean;
  profiles: { full_name: string | null } | { full_name: string | null }[] | null;
};

function nameOf(p: InitialSubmission['profiles']): string {
  if (!p) return 'Учень';
  const one = Array.isArray(p) ? p[0] : p;
  return one?.full_name || 'Учень';
}

export function LiveBoard({ lesson, initialSubmissions }: { lesson: Lesson; initialSubmissions: InitialSubmission[] }) {
  const [rows, setRows] = useState<Record<string, StudentRow>>(() => {
    const map: Record<string, StudentRow> = {};
    for (const s of initialSubmissions) {
      map[s.student_id] ??= { studentId: s.student_id, studentName: nameOf(s.profiles), cells: {} };
      map[s.student_id].cells[s.exercise_id] = {
        answer: s.answer,
        isCorrect: s.is_correct,
        submitted: true,
        editedByTeacher: s.edited_by_teacher,
      };
    }
    return map;
  });

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`lesson-draft-${lesson.slug}`, { config: { private: true } });

    channel
      .on('broadcast', { event: 'draft' }, ({ payload }) => {
        setRows((prev) => {
          const next = { ...prev };
          const id = payload.studentId as string;
          next[id] = next[id] ?? { studentId: id, studentName: payload.studentName, cells: {} };
          next[id] = { ...next[id], studentName: payload.studentName || next[id].studentName };
          next[id].cells = {
            ...next[id].cells,
            [payload.exerciseId]: {
              answer: payload.answer,
              isCorrect: payload.isCorrect,
              submitted: Boolean(payload.submitted),
              editedByTeacher: next[id].cells[payload.exerciseId]?.editedByTeacher && !payload.submitted,
            },
          };
          return next;
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lesson.slug]);

  const studentList = useMemo(
    () => Object.values(rows).sort((a, b) => a.studentName.localeCompare(b.studentName, 'uk')),
    [rows]
  );

  const updateCell = (studentId: string, exerciseId: string, cell: Cell) => {
    setRows((prev) => {
      const next = { ...prev };
      if (!next[studentId]) return prev;
      next[studentId] = { ...next[studentId], cells: { ...next[studentId].cells, [exerciseId]: cell } };
      return next;
    });
  };

  if (studentList.length === 0) {
    return (
      <p className="rounded-xl border border-ink-line bg-ink-raised/50 p-6 text-paper-muted">
        Поки що ніхто не відкривав цей урок. Список зʼявиться, щойно учень зайде і почне відповідати.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {studentList.map((row) => (
        <div key={row.studentId} className="rounded-xl border border-ink-line bg-ink-raised/40 p-5">
          <h3 className="mb-4 font-display text-lg text-gold-bright">{row.studentName}</h3>
          <div className="flex flex-col gap-4">
            {lesson.exercises.map((exercise, i) => (
              <LiveCell
                key={exercise.id}
                index={i}
                exercise={exercise}
                lessonSlug={lesson.slug}
                studentId={row.studentId}
                cell={row.cells[exercise.id]}
                onSaved={(cell) => updateCell(row.studentId, exercise.id, cell)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function formatAnswer(exercise: Exercise, answer: any): string {
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

function LiveCell({
  exercise,
  lessonSlug,
  studentId,
  cell,
  index,
  onSaved,
}: {
  exercise: Exercise;
  lessonSlug: string;
  studentId: string;
  cell: Cell | undefined;
  index: number;
  onSaved: (cell: Cell) => void;
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
      const res = await overrideAnswer(lessonSlug, exercise.id, studentId, answer);
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
        <span className="text-xs uppercase tracking-wide text-paper-muted">Завдання {index + 1}</span>
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
          {exercise.type === 'matching' && (
            <Matching
              leftItems={exercise.pairs.map((p) => ({ id: p.id, left: p.left }))}
              rightItems={exercise.pairs.map((p) => p.right)}
              value={matchValue}
              onChange={(leftId, rightValue) => setMatchValue((prev) => ({ ...prev, [leftId]: rightValue }))}
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
