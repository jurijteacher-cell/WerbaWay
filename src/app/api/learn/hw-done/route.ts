import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { slug } = (await req.json().catch(() => ({}))) as { slug?: string };
  if (!slug || !/^[a-z0-9][a-z0-9-]*$/.test(slug)) return NextResponse.json({ error: 'bad slug' }, { status: 400 });

  const { error } = await supabase.rpc('mark_homework_done', { p_slug: slug });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
