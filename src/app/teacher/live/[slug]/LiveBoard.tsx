'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Lesson } from '@/content/types';
import { AnswerCell, type AnswerCellState } from '@/components/teacher/AnswerCell';

type StudentRow = {
  studentId: string;
  studentName: string;
  cells: Record<string, AnswerCellState>; // exerciseId -> Cell
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

  const updateCell = (studentId: string, exerciseId: string, cell: AnswerCellState) => {
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
              <AnswerCell
                key={exercise.id}
                label={`Завдання ${i + 1}`}
                exercise={exercise}
                lessonSlug={lesson.slug}
                studentId={row.studentId}
                cell={row.cells[exercise.id]}
                revalidatePath={`/teacher/live/${lesson.slug}`}
                onSaved={(cell) => updateCell(row.studentId, exercise.id, cell)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
