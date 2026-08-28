'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Lecture } from '@/content/types';
import { AnswerCell, formatAnswer, type AnswerCellState } from '@/components/teacher/AnswerCell';
import { assignLecture, unassignLecture } from './actions';

type Student = { id: string; full_name: string | null };

type ProfileRef = { full_name: string | null } | { full_name: string | null }[] | null;

function nameOf(p: ProfileRef, fallback = 'Учень'): string {
  if (!p) return fallback;
  const one = Array.isArray(p) ? p[0] : p;
  return one?.full_name || fallback;
}

type InitialAssignment = { student_id: string; profiles: ProfileRef };
type InitialSubmission = {
  student_id: string;
  lesson_slug: string;
  exercise_id: string;
  answer: any;
  is_correct: boolean | null;
  auto_graded: boolean;
  edited_by_teacher: boolean;
  profiles: ProfileRef;
};

type Position = { sectionLabel: string; exerciseId: string; updatedAt: number };

type RosterEntry = {
  studentId: string;
  studentName: string;
  isAssigned: boolean;
  position?: Position;
  cells: Record<string, AnswerCellState>; // exerciseId -> cell
};

export function LectureLiveBoard({
  lecture,
  allStudents,
  initialAssignments,
  initialSubmissions,
}: {
  lecture: Lecture;
  allStudents: Student[];
  initialAssignments: InitialAssignment[];
  initialSubmissions: InitialSubmission[];
}) {
  const flatByExerciseId = useMemo(() => {
    const map: Record<string, { exercise: Lecture['sections'][number]['exercises'][number]; sectionLabel: string; lessonSlug: string; indexInSection: number }> = {};
    lecture.sections.forEach((section) => {
      section.exercises.forEach((exercise, i) => {
        map[exercise.id] = { exercise, sectionLabel: section.label, lessonSlug: section.lessonSlug, indexInSection: i };
      });
    });
    return map;
  }, [lecture]);

  const [roster, setRoster] = useState<Record<string, RosterEntry>>(() => {
    const map: Record<string, RosterEntry> = {};
    for (const a of initialAssignments) {
      map[a.student_id] ??= { studentId: a.student_id, studentName: nameOf(a.profiles), isAssigned: true, cells: {} };
      map[a.student_id].isAssigned = true;
    }
    for (const s of initialSubmissions) {
      map[s.student_id] ??= { studentId: s.student_id, studentName: nameOf(s.profiles), isAssigned: false, cells: {} };
      map[s.student_id].cells[s.exercise_id] = {
        answer: s.answer,
        isCorrect: s.is_correct,
        submitted: true,
        editedByTeacher: s.edited_by_teacher,
      };
    }
    return map;
  });

  const [assignSelection, setAssignSelection] = useState('');
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`lecture-draft-${lecture.slug}`, { config: { private: true } });

    channel
      .on('broadcast', { event: 'draft' }, ({ payload }) => {
        setRoster((prev) => {
          const next = { ...prev };
          const id = payload.studentId as string;
          next[id] = next[id] ?? { studentId: id, studentName: payload.studentName, isAssigned: false, cells: {} };
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
      .on('broadcast', { event: 'position' }, ({ payload }) => {
        setRoster((prev) => {
          const next = { ...prev };
          const id = payload.studentId as string;
          next[id] = next[id] ?? { studentId: id, studentName: payload.studentName, isAssigned: false, cells: {} };
          next[id] = {
            ...next[id],
            studentName: payload.studentName || next[id].studentName,
            position: { sectionLabel: payload.sectionLabel, exerciseId: payload.exerciseId, updatedAt: payload.updatedAt },
          };
          return next;
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lecture.slug]);

  const updateCell = (studentId: string, exerciseId: string, cell: AnswerCellState) => {
    setRoster((prev) => {
      const next = { ...prev };
      if (!next[studentId]) return prev;
      next[studentId] = { ...next[studentId], cells: { ...next[studentId].cells, [exerciseId]: cell } };
      return next;
    });
  };

  const rosterList = useMemo(
    () =>
      Object.values(roster).sort((a, b) => {
        if (a.isAssigned !== b.isAssigned) return a.isAssigned ? -1 : 1;
        return a.studentName.localeCompare(b.studentName, 'uk');
      }),
    [roster]
  );

  const assignedIds = new Set(rosterList.filter((r) => r.isAssigned).map((r) => r.studentId));
  const assignableStudents = allStudents.filter((s) => !assignedIds.has(s.id));

  const handleAssign = () => {
    if (!assignSelection) return;
    startTransition(async () => {
      const res = await assignLecture(lecture.slug, assignSelection);
      if (res.ok) {
        const student = allStudents.find((s) => s.id === assignSelection);
        setRoster((prev) => ({
          ...prev,
          [assignSelection]: prev[assignSelection]
            ? { ...prev[assignSelection], isAssigned: true }
            : { studentId: assignSelection, studentName: student?.full_name || 'Учень', isAssigned: true, cells: {} },
        }));
        setAssignSelection('');
      }
    });
  };

  const handleUnassign = (studentId: string) => {
    startTransition(async () => {
      const res = await unassignLecture(lecture.slug, studentId);
      if (res.ok) {
        setRoster((prev) => ({ ...prev, [studentId]: { ...prev[studentId], isAssigned: false } }));
      }
    });
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Призначення */}
      <div className="rounded-xl border border-ink-line bg-ink-raised/40 p-5">
        <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-gold-dim">Призначити лекцію</h2>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={assignSelection}
            onChange={(e) => setAssignSelection(e.target.value)}
            className="rounded-lg border border-ink-line bg-ink px-3 py-2 text-sm text-paper outline-none focus:border-gold"
          >
            <option value="">Обери учня…</option>
            {assignableStudents.map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name || s.id}
              </option>
            ))}
          </select>
          <button
            onClick={handleAssign}
            disabled={!assignSelection || isPending}
            className="rounded-lg bg-gold px-4 py-2 text-sm font-medium text-ink hover:bg-gold-bright disabled:opacity-50"
          >
            Призначити
          </button>
        </div>
        {rosterList.some((r) => r.isAssigned) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {rosterList
              .filter((r) => r.isAssigned)
              .map((r) => (
                <span
                  key={r.studentId}
                  className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 px-3 py-1 text-xs text-gold"
                >
                  {r.studentName}
                  <button onClick={() => handleUnassign(r.studentId)} className="text-gold/60 hover:text-incorrect">
                    ×
                  </button>
                </span>
              ))}
          </div>
        )}
      </div>

      {/* Ростер */}
      {rosterList.length === 0 && (
        <p className="rounded-xl border border-ink-line bg-ink-raised/50 p-6 text-paper-muted">
          Ще ніхто не призначений і не заходив у цю лекцію.
        </p>
      )}

      {rosterList.map((row) => (
        <StudentLectureRow
          key={row.studentId}
          row={row}
          lecture={lecture}
          flatByExerciseId={flatByExerciseId}
          onSaved={(exerciseId, cell) => updateCell(row.studentId, exerciseId, cell)}
        />
      ))}
    </div>
  );
}

function StudentLectureRow({
  row,
  lecture,
  flatByExerciseId,
  onSaved,
}: {
  row: RosterEntry;
  lecture: Lecture;
  flatByExerciseId: Record<string, { exercise: any; sectionLabel: string; lessonSlug: string; indexInSection: number }>;
  onSaved: (exerciseId: string, cell: AnswerCellState) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const current = row.position ? flatByExerciseId[row.position.exerciseId] : undefined;

  const otherEntries = Object.entries(row.cells).filter(([exerciseId]) => exerciseId !== row.position?.exerciseId);

  return (
    <div className="rounded-xl border border-ink-line bg-ink-raised/40 p-5">
      <div className="mb-4 flex items-center gap-2">
        <h3 className="font-display text-lg text-gold-bright">{row.studentName}</h3>
        {row.isAssigned && (
          <span className="rounded-full border border-gold/30 px-2 py-0.5 text-[10px] uppercase tracking-wide text-gold-dim">
            призначено
          </span>
        )}
      </div>

      {!row.position && <p className="text-sm text-paper-muted">Ще не заходив(-ла) у цю лекцію.</p>}

      {current && (
        <div className="mb-4">
          <p className="mb-1.5 font-mono text-[11px] uppercase tracking-widest text-gold">
            Зараз тут · {current.sectionLabel} · Завдання {current.indexInSection + 1}
          </p>
          <AnswerCell
            label={current.exercise.prompt}
            exercise={current.exercise}
            lessonSlug={current.lessonSlug}
            studentId={row.studentId}
            cell={row.cells[current.exercise.id]}
            revalidatePath={`/teacher/live/lectures/${lecture.slug}`}
            onSaved={(cell) => onSaved(current.exercise.id, cell)}
          />
        </div>
      )}

      {otherEntries.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-xs text-paper-muted hover:text-gold">
            Інші відповіді в цій лекції ({otherEntries.length})
          </summary>
          <div className="mt-3 flex flex-col gap-2">
            {otherEntries.map(([exerciseId, cell]) => {
              const info = flatByExerciseId[exerciseId];
              if (!info) return null;
              if (expandedId === exerciseId) {
                return (
                  <AnswerCell
                    key={exerciseId}
                    label={`${info.sectionLabel} · Завдання ${info.indexInSection + 1}`}
                    exercise={info.exercise}
                    lessonSlug={info.lessonSlug}
                    studentId={row.studentId}
                    cell={cell}
                    revalidatePath={`/teacher/live/lectures/${lecture.slug}`}
                    onSaved={(c) => {
                      onSaved(exerciseId, c);
                      setExpandedId(null);
                    }}
                  />
                );
              }
              return (
                <div
                  key={exerciseId}
                  className="flex items-center justify-between gap-3 rounded-lg border border-ink-line px-3 py-2 text-sm"
                >
                  <span className="text-paper-muted">
                    {info.sectionLabel} · Завдання {info.indexInSection + 1}:{' '}
                    <span className="text-paper/90">{formatAnswer(info.exercise, cell.answer)}</span>
                  </span>
                  <button onClick={() => setExpandedId(exerciseId)} className="shrink-0 text-xs text-gold hover:text-gold-bright">
                    Редагувати
                  </button>
                </div>
              );
            })}
          </div>
        </details>
      )}
    </div>
  );
}
