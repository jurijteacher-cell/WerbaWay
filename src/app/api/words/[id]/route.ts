import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const clip = (v: unknown, n: number) => (typeof v === 'string' ? v.trim().slice(0, n) : undefined);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Правка слова: власник колоди і викладач (RLS). */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!UUID.test(params.id)) return NextResponse.json({ error: 'bad id' }, { status: 400 });
  const supabase = createClient();
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const patch: Record<string, string | null> = {};
  for (const [k, n] of [['term', 120], ['forms', 200], ['translation', 200], ['example', 300], ['example_tr', 300]] as const) {
    const v = clip(b?.[k], n);
    if (v !== undefined) patch[k] = v || null;
  }
  if (patch.term === null || patch.translation === null) return NextResponse.json({ error: 'empty' }, { status: 400 });
  if (!Object.keys(patch).length) return NextResponse.json({ error: 'nothing' }, { status: 400 });
  patch.source = 'manual';
  const { data, error } = await supabase.from('student_words').update(patch).eq('id', params.id).is('deleted_at', null).select().maybeSingle();
  if (error || !data) return NextResponse.json({ error: error?.message ?? 'not found' }, { status: error ? 400 : 404 });
  return NextResponse.json({ word: data });
}

/** Видалення (м'яке): слово зникає з колоди, місце звільняється для нових. */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  if (!UUID.test(params.id)) return NextResponse.json({ error: 'bad id' }, { status: 400 });
  const supabase = createClient();
  const { data, error } = await supabase
    .from('student_words')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', params.id)
    .is('deleted_at', null)
    .select('id')
    .maybeSingle();
  if (error || !data) return NextResponse.json({ error: error?.message ?? 'not found' }, { status: error ? 400 : 404 });
  return NextResponse.json({ ok: true });
}
