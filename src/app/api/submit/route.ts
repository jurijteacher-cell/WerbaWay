import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getLessonBySlug } from '@/content/lessons';
import { evaluateExercise } from '@/lib/evaluate-exercise';

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Потрібна авторизація' }, { status: 401 });
  }

  const body = await req.json();
  const { lessonSlug, exerciseId, exerciseType, answer } = body ?? {};

  if (!lessonSlug || !exerciseId || !exerciseType) {
    return NextResponse.json({ error: 'Некоректний запит' }, { status: 400 });
  }

  const lesson = getLessonBySlug(lessonSlug);
  const exercise = lesson?.exercises.find((e) => e.id === exerciseId);

  if (!lesson || !exercise) {
    return NextResponse.json({ error: 'Урок або вправу не знайдено' }, { status: 404 });
  }

  const { isCorrect, autoGraded, feedback } = await evaluateExercise(exercise, answer);

  const { error } = await supabase.from('submissions').upsert(
    {
      student_id: user.id,
      lesson_slug: lessonSlug,
      exercise_id: exerciseId,
      exercise_type: exerciseType,
      answer,
      is_correct: isCorrect,
      auto_graded: autoGraded,
      teacher_feedback: feedback ?? null,
      submitted_at: new Date().toISOString(),
      graded_at: autoGraded ? new Date().toISOString() : null,
    },
    { onConflict: 'student_id,lesson_slug,exercise_id' }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, autoGraded, isCorrect, feedback: feedback ?? null });
}
