import { NextResponse } from 'next/server';
import { loadMockExam, toPublicMockExam } from '@/lib/mock-exam/core';

type Ctx = { params: { lessonId: string } };

export async function GET(_req: Request, { params }: Ctx) {
  const exam = loadMockExam(params.lessonId);
  if (!exam) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(toPublicMockExam(exam));
}
