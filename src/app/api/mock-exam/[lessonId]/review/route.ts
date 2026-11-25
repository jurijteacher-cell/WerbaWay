import { NextRequest, NextResponse } from 'next/server';
import { loadMockExam, scoreMockExam, transcriptsOf } from '@/lib/mock-exam/core';
import { reconstructAnswers, type StoredScore } from '@/lib/mock-exam/review';
import { gradeExamWriting, hasWritingText } from '@/lib/mock-exam/writing-grade';
import { createUserClient } from '@/lib/supabase/user-token';
import { createAdminClient } from '@/lib/supabase/admin';
import { getLocale } from '@/i18n/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type Ctx = { params: { lessonId: string } };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Розбір спроби пробного іспиту.
 * `{token}` → список власних спроб цього іспиту (для вкладки «Start»: «Twoje podejścia»).
 * `{token, result_id}` → одна спроба: відповіді учня, свіжий підрахунок, транскрипти, оцінка письма.
 *   Читає власник або викладач (RLS `mock_results: own or teacher reads`).
 *   Якщо письмо ще не оцінене AI (старі спроби), оцінює зараз і дописує в рядок.
 */
export async function POST(req: NextRequest, { params }: Ctx) {
  const body = await req
    .text()
    .then((t) => JSON.parse(t))
    .catch(() => null);
  const token = typeof body?.token === 'string' ? body.token : '';
  if (!token) return NextResponse.json({ error: 'login required' }, { status: 401 });
  const supabase = createUserClient(token);
  const { data: u } = await supabase.auth.getUser(token);
  if (!u.user) return NextResponse.json({ error: 'login required' }, { status: 401 });

  const resultId = typeof body?.result_id === 'string' ? body.result_id : '';

  if (!resultId) {
    const { data } = await supabase
      .from('mock_results')
      .select('id, total, max_total, level, passed, minutes, created_at, writing_ai:score->writing_ai')
      .eq('user_id', u.user.id)
      .eq('lesson_id', params.lessonId)
      .order('created_at', { ascending: false })
      .limit(20);
    const attempts = (data ?? []).map((r) => {
      const ai = (r as { writing_ai?: Array<{ points: number; max: number }> | null }).writing_ai;
      return {
        id: r.id,
        total: Number(r.total),
        max: Number(r.max_total),
        level: r.level,
        passed: r.passed,
        minutes: r.minutes,
        created_at: r.created_at,
        writing: ai?.length ? { points: ai.reduce((a, g) => a + g.points, 0), max: ai.reduce((a, g) => a + g.max, 0) } : null,
      };
    });
    return NextResponse.json({ attempts });
  }

  if (!UUID.test(resultId)) return NextResponse.json({ error: 'bad id' }, { status: 400 });
  const { data: row } = await supabase.from('mock_results').select('*').eq('id', resultId).maybeSingle();
  if (!row || row.lesson_id !== params.lessonId) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const locale = getLocale();
  const exam = loadMockExam(row.lesson_id, locale);
  if (!exam) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const stored = (row.score ?? {}) as StoredScore;
  const answers = reconstructAnswers(exam, stored);
  const score = scoreMockExam(exam, answers);

  let writingAi = stored.writing_ai;
  if (writingAi == null && hasWritingText(exam, answers)) {
    writingAi = await gradeExamWriting(exam, answers, locale);
    const admin = createAdminClient();
    if (writingAi && admin) {
      const { error } = await admin
        .from('mock_results')
        .update({ score: { ...stored, answers: stored.answers ?? answers, writing_ai: writingAi } })
        .eq('id', resultId);
      if (error) console.error('[mock-exam] writing_ai update failed', error.message);
    }
  }

  const isOwner = row.user_id === u.user.id;
  let student = '';
  if (!isOwner) {
    const { data: prof } = await supabase.from('profiles').select('full_name').eq('id', row.user_id).maybeSingle();
    student = prof?.full_name ?? '';
  }

  return NextResponse.json({
    result_id: row.id,
    created_at: row.created_at,
    minutes: row.minutes,
    is_owner: isOwner,
    student,
    answers,
    score,
    transcripts: transcriptsOf(exam),
    writing_ai: writingAi ?? null,
  });
}
