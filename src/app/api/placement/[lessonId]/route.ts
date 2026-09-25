import { NextResponse } from 'next/server';
import { loadPlacementTest, toPublicPlacement } from '@/lib/placement/core';

type Ctx = { params: { lessonId: string } };

export async function GET(_req: Request, { params }: Ctx) {
  const test = loadPlacementTest(params.lessonId);
  if (!test) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  return NextResponse.json(toPublicPlacement(test));
}
