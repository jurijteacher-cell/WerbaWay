import { NextResponse } from 'next/server';
import { loadPlacementTest, toPublicPlacement } from '@/lib/placement/core';
import { getLocale } from '@/i18n/server';

type Ctx = { params: { lessonId: string } };

export async function GET(_req: Request, { params }: Ctx) {
  const test = loadPlacementTest(params.lessonId, getLocale());
  if (!test) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  return NextResponse.json(toPublicPlacement(test));
}
