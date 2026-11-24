import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { MAX_ELS, sanitizeEls } from '@/lib/board/types';

export const dynamic = 'force-dynamic';

/** Збереження дошки (в тому числі з pagehide через fetch keepalive). Лише викладач; виграє вищий rev. */
export async function PUT(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (me?.role !== 'teacher') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const b = (await req.json().catch(() => null)) as { els?: unknown; vp?: unknown; follow?: unknown; rev?: unknown } | null;
  const rev = typeof b?.rev === 'number' && Number.isFinite(b.rev) ? Math.floor(b.rev) : -1;
  if (rev < 0) return NextResponse.json({ error: 'bad rev' }, { status: 400 });
  const els = sanitizeEls(b?.els).slice(0, MAX_ELS);
  const { data, error } = await supabase
    .from('teacher_board')
    .update({ els, vp: b?.vp ?? null, follow: b?.follow !== false, rev, updated_at: new Date().toISOString() })
    .eq('id', 1)
    .lte('rev', rev)
    .select('rev');
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data?.length) return NextResponse.json({ error: 'conflict' }, { status: 409 });
  return NextResponse.json({ ok: true });
}
