import { NextRequest, NextResponse } from 'next/server';
import { loadMockExam, scoreMockExam, transcriptsOf } from '@/lib/mock-exam/core';
import { writeMockResult, weakTopics } from '@/lib/mock-exam/notion';
import { createUserClient } from '@/lib/supabase/user-token';

type Ctx = { params: { lessonId: string } };

/** Scores a submitted mock exam on the server and writes one row to the teacher's Notion database. */
export function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const exam = loadMockExam(params.lessonId);
  if (!exam) return NextResponse.json({ error: 'not found' }, { status: 404 });

  // body may arrive as text/plain (no CORS preflight from sandboxed iframes)
  const body = await req
    .text()
    .then((t) => JSON.parse(t))
    .catch(() => null);
  // the student must be logged in: result goes to their account (and to Notion under their name)
  const token = typeof body?.token === 'string' ? body.token : '';
  if (!token) return NextResponse.json({ error: 'login required' }, { status: 401 });
  const supabase = createUserClient(token);
  const { data: u } = await supabase.auth.getUser(token);
  if (!u.user) return NextResponse.json({ error: 'login required' }, { status: 401 });
  const { data: prof } = await supabase.from('profiles').select('full_name').eq('id', u.user.id).maybeSingle();
  const imie = (prof?.full_name || u.user.email?.split('@')[0] || 'Uczeń').trim().slice(0, 120);

  const raw = (body?.answers ?? {}) as Record<string, unknown>;
  const answers: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw).slice(0, 400)) {
    if (typeof v !== 'string') continue;
    // writing parts (`task:part`) carry whole texts; everything else is a short answer
    const long = k.includes(':') && !k.endsWith(':choice');
    answers[k.slice(0, 40)] = v.slice(0, long ? 6000 : 400);
  }
  const minutes = Number(body?.minutes ?? 0);

  const score = scoreMockExam(exam, answers);
  const mins = Number.isFinite(minutes) && minutes > 0 ? Math.min(minutes, 600) : 0;

  const { error: dbError } = await supabase.from('mock_results').insert({
    user_id: u.user.id,
    lesson_id: exam.lesson_id,
    exam_label: exam.exam_label,
    scoring: exam.scoring ?? 'per-section',
    total: score.total,
    max_total: score.max,
    level: score.level ?? null,
    passed: score.passed,
    minutes: Math.round(mins * 10) / 10,
    score: { sections: score.sections, pending: score.pending, weak: weakTopics(exam, score).slice(0, 20) },
  });
  if (dbError) console.error('[mock-exam] mock_results insert failed', dbError.message);

  const notion = await writeMockResult({
    exam,
    score,
    imie,
    minutes: mins,
  });
  if (!notion.ok) console.error('[mock-exam] notion write failed', notion.error);

  return NextResponse.json({
    score,
    transcripts: transcriptsOf(exam),
    notionSaved: notion.ok,
    accountSaved: !dbError,
    notionError: notion.ok ? undefined : (notion.error ?? '').split(':')[0],
  });
}
