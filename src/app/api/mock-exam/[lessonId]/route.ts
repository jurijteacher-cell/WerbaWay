import { NextResponse } from 'next/server';
import { loadMockExam, toPublicMockExam } from '@/lib/mock-exam/core';
import { getLocale } from '@/i18n/server';

type Ctx = { params: { lessonId: string } };

export async function GET(_req: Request, { params }: Ctx) {
  const exam = loadMockExam(params.lessonId, getLocale());
  if (!exam) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(toPublicMockExam(exam));
}
