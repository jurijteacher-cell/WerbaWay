import { NextRequest, NextResponse } from 'next/server';
import {
  computeFinalLevel,
  loadPlacementTest,
  resultCopy,
  type LevelScoreDetail,
} from '@/lib/placement/core';
import { writePlacementResult } from '@/lib/placement/notion';
import { verifyPlacementPayload } from '@/lib/placement/session';

type Ctx = { params: { lessonId: string } };

type LevelTokenPayload = {
  lessonId: string;
  detail: LevelScoreDetail;
  ts: number;
};

export async function POST(req: NextRequest, { params }: Ctx) {
  const test = loadPlacementTest(params.lessonId);
  if (!test) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const imie = String(body?.imie ?? '').trim();
  const writingText = String(body?.writingText ?? '');
  const minutes = Number(body?.minutes ?? 0);
  const tokens = (body?.levelTokens ?? []) as string[];

  if (!imie) {
    return NextResponse.json({ error: 'imie required' }, { status: 400 });
  }

  const details: LevelScoreDetail[] = [];
  for (const token of tokens) {
    const payload = verifyPlacementPayload<LevelTokenPayload>(token);
    if (!payload || payload.lessonId !== params.lessonId) {
      return NextResponse.json({ error: 'invalid session' }, { status: 400 });
    }
    details.push(payload.detail);
  }

  if (!details.length) {
    return NextResponse.json({ error: 'no levels' }, { status: 400 });
  }

  // Rebuild progression using signed scores only
  const ordered: LevelScoreDetail[] = [];
  for (const L of test.scoring.levels_order) {
    const d = details.find((x) => x.level === L);
    if (!d) break;
    ordered.push(d);
    if (d.score < test.scoring.pass_threshold) break;
  }

  const { level } = computeFinalLevel(test, ordered);
  const copy = resultCopy(test, level);
  const writingVariant =
    test.scoring.writing_variant_by_level[level] ??
    test.scoring.writing_variant_by_level['A1'] ??
    'A';

  const levelPercents: Partial<Record<'A1' | 'A2' | 'B1' | 'B2', number>> = {};
  const partAgg: Record<string, { correct: number; total: number }> = {};
  const errors: string[] = [];
  const weak = new Set<string>();
  let kalki = 0;
  let falseFriends = 0;

  for (const d of ordered) {
    levelPercents[d.level] = d.score;
    for (const [part, stats] of Object.entries(d.byPart)) {
      if (!partAgg[part]) partAgg[part] = { correct: 0, total: 0 };
      partAgg[part].correct += stats.correct;
      partAgg[part].total += stats.total;
    }
    for (const e of d.errors) {
      errors.push(`${e.id} → ${e.answer || '—'}`);
      if (e.topic) weak.add(e.topic);
      if (e.trap === 'kalka-uk') kalki += 1;
      if (e.trap === 'false-friend') falseFriends += 1;
    }
  }

  const partPercents: Partial<
    Record<'gramatyka' | 'słownictwo' | 'czytanie', number>
  > = {};
  for (const part of ['gramatyka', 'słownictwo', 'czytanie'] as const) {
    const s = partAgg[part];
    if (s?.total) partPercents[part] = s.correct / s.total;
  }

  const notion = await writePlacementResult({
    imie,
    lessonId: params.lessonId,
    level,
    levelPercents,
    partPercents,
    kalki,
    falseFriends,
    weakTopics: [...weak],
    errorsText: errors.join('\n'),
    writingText,
    writingVariant,
    minutes: Number.isFinite(minutes) ? minutes : 0,
  });

  return NextResponse.json({
    ...copy,
    writingVariant,
    notionSaved: notion.ok,
    notionError: notion.ok ? undefined : notion.error,
  });
}
