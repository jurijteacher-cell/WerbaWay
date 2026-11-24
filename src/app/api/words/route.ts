import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { nextDeckNo } from '@/lib/my-words';
import { resolveOwner } from './owner';

export const dynamic = 'force-dynamic';

const clip = (v: unknown, n: number) => (typeof v === 'string' ? v.trim().slice(0, n) : '');

/** Нове слово в колоду власника (по 20 слів у колоді). Викладач у класі → ще й картка в чат учня. */
export async function POST(req: Request) {
  const supabase = createClient();
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const o = await resolveOwner(supabase, b?.studentId as string | undefined);
  if (!o.ok) return NextResponse.json({ error: o.error }, { status: o.status });
  const term = clip(b?.term, 120);
  const translation = clip(b?.translation, 200);
  if (!term || !translation) return NextResponse.json({ error: 'empty' }, { status: 400 });
  const source = b?.source === 'ai' || b?.source === 'ai-edited' ? b.source : 'manual';

  const deck_no = await nextDeckNo(supabase, o.ownerId);
  const { data: word, error } = await supabase
    .from('student_words')
    .insert({
      student_id: o.ownerId,
      deck_no,
      term,
      forms: clip(b?.forms, 200) || null,
      translation,
      tr_lang: o.lang,
      example: clip(b?.example, 300) || null,
      example_tr: clip(b?.example_tr, 300) || null,
      source,
      created_by: o.userId,
    })
    .select()
    .single();
  if (error || !word) return NextResponse.json({ error: error?.message ?? 'insert' }, { status: 400 });

  // викладач додав слово учню → картка в чаті (клієнт ще розішле її по каналу dock)
  let chat = null;
  if (o.role === 'teacher' && o.ownerId !== o.userId) {
    const { data } = await supabase
      .from('class_messages')
      .insert({
        student_id: o.ownerId,
        sender_id: o.userId,
        sender_role: 'teacher',
        kind: 'word',
        body: `${term} — ${translation}`,
        meta: { word_id: word.id, example: word.example, example_tr: word.example_tr, forms: word.forms },
      })
      .select()
      .single();
    chat = data ?? null;
  }
  return NextResponse.json({ word, chat });
}
