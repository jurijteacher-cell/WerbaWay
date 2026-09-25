import { NextRequest, NextResponse } from 'next/server';
import {
  computeFinalLevel,
  loadPlacementTest,
  scoreLevel,
  type LevelScoreDetail,
  type PlacementLevel,
} from '@/lib/placement/core';
import {
  signPlacementPayload,
  verifyPlacementPayload,
} from '@/lib/placement/session';

type Ctx = { params: { lessonId: string } };

export async function POST(req: NextRequest, { params }: Ctx) {
  const test = loadPlacementTest(params.lessonId);
  if (!test) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const level = body?.level as PlacementLevel | undefined;
  const answers = (body?.answers ?? {}) as Record<string, string>;

  if (!level || !test.scoring.levels_order.includes(level)) {
    return NextResponse.json({ error: 'bad level' }, { status: 400 });
  }

  const priorTokens = (body?.priorTokens ?? []) as string[];
  const priorDetails: LevelScoreDetail[] = [];
  for (const t of priorTokens) {
    const p = verifyPlacementPayload<{ detail: LevelScoreDetail }>(t);
    if (p?.detail) priorDetails.push(p.detail);
  }

  const detail = scoreLevel(test, level, answers);
  const passed = detail.score >= test.scoring.pass_threshold;
  const order = test.scoring.levels_order;
  const idx = order.indexOf(level);
  const next =
    passed && idx < order.length - 1 ? order[idx + 1] : ('pisanie' as const);

  const token = signPlacementPayload({
    lessonId: params.lessonId,
    detail,
    ts: Date.now(),
  });

  let writingVariant: 'A' | 'B' | undefined;
  if (next === 'pisanie') {
    const { level: provisional } = computeFinalLevel(test, [
      ...priorDetails,
      detail,
    ]);
    writingVariant =
      test.scoring.writing_variant_by_level[provisional] ??
      test.scoring.writing_variant_by_level['A1'] ??
      'A';
  }

  return NextResponse.json({ next, token, writingVariant });
}
