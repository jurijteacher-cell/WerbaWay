import { NextRequest, NextResponse } from 'next/server';
import { createAnonClient } from '@/lib/supabase/anon';

export const dynamic = 'force-dynamic';

type Attempt = {
  lessonId?: string;
  embed?: string;
  blockId?: string | null;
  itemId?: string;
  itemType?: string | null;
  grammarPoint?: string | null;
  prompt?: string | null;
  answer?: string | null;
  expected?: string | null;
  correct?: boolean | null;
};

const str = (v: unknown) => (typeof v === 'string' ? v : v == null ? null : String(v));

/** POST /api/embed/attempt  { code, attempts: Attempt[] } → { saved } */
export async function POST(req: NextRequest) {
  let body: { code?: string; attempts?: Attempt[] };
  try {
    // sendBeacon sends text/plain — parse manually
    body = JSON.parse(await req.text());
  } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 });
  }
  const code = String(body.code ?? '').trim().toUpperCase();
  const attempts = Array.isArray(body.attempts) ? body.attempts.slice(0, 50) : [];
  if (!/^[A-Z0-9]{4,12}$/.test(code) || !attempts.length) {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }

  const supabase = createAnonClient();
  let saved = 0;
  for (const a of attempts) {
    const { data, error } = await supabase.rpc('embed_record_attempt', {
      p_code: code,
      p_lesson_id: str(a.lessonId),
      p_embed: str(a.embed),
      p_block_id: str(a.blockId),
      p_item_id: str(a.itemId),
      p_item_type: str(a.itemType),
      p_grammar_point: str(a.grammarPoint),
      p_prompt: str(a.prompt),
      p_answer: str(a.answer),
      p_expected: str(a.expected),
      p_is_correct: typeof a.correct === 'boolean' ? a.correct : null,
    });
    if (error) return NextResponse.json({ error: 'db', saved }, { status: 500 });
    if (data === false) return NextResponse.json({ error: 'unknown code', saved }, { status: 404 });
    saved++;
  }
  return NextResponse.json({ saved });
}
