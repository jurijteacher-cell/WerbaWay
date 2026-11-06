import { NextRequest, NextResponse } from 'next/server';
import { loadMockExam, scoreMockExam } from '@/lib/mock-exam/core';
import { writeMockResult } from '@/lib/mock-exam/notion';

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
  const imie = String(body?.imie ?? '').trim().slice(0, 120);
  if (!imie) return NextResponse.json({ error: 'imie required' }, { status: 400 });

  const raw = (body?.answers ?? {}) as Record<string, unknown>;
  const answers: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === 'string') answers[k.slice(0, 40)] = v.slice(0, 400);
  }
  const minutes = Number(body?.minutes ?? 0);

  const score = scoreMockExam(exam, answers);
  const notion = await writeMockResult({
    exam,
    score,
    imie,
    minutes: Number.isFinite(minutes) && minutes > 0 ? Math.min(minutes, 600) : 0,
  });
  if (!notion.ok) console.error('[mock-exam] notion write failed', notion.error);

  return NextResponse.json({
    score,
    notionSaved: notion.ok,
    notionError: notion.ok ? undefined : (notion.error ?? '').split(':')[0],
  });
}
