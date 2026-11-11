import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type Item = { slug: string; id: string; known: boolean; seen: number; correct: number };
const SLUG = /^[a-z0-9][a-z0-9-]*$/;

/** Зберігає позначки слів (абсолютні значення; RLS пускає лише рядки самого учня) */
export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { items?: Item[] } | null;
  const items = (body?.items ?? []).slice(0, 200);
  const rows = items
    .filter((i) => SLUG.test(i.slug) && typeof i.id === 'string' && i.id.length < 40)
    .map((i) => ({
      student_id: user.id,
      lesson_slug: i.slug,
      word_id: i.id,
      known: !!i.known,
      seen: Math.max(0, Math.min(100000, Math.floor(Number(i.seen) || 0))),
      correct: Math.max(0, Math.min(100000, Math.floor(Number(i.correct) || 0))),
      updated_at: new Date().toISOString(),
    }));
  if (!rows.length) return NextResponse.json({ ok: true, saved: 0 });

  const { error } = await supabase.from('vocab_progress').upsert(rows);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, saved: rows.length });
}
