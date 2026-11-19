import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { loadPage } from '@/lib/pages/pages';
import { isMissingTable, isPendingPurge, pageHash, type TrashRow } from '@/lib/pages/trash';

export const dynamic = 'force-dynamic';

async function teacher() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  return data?.role === 'teacher' ? { supabase, user } : null;
}

const NO_TABLE = {
  error: 'no_table',
  message: 'Кошик ще не ввімкнено в базі: потрібна міграція supabase/migrations/0017_lecture_trash.sql.',
};

type Action = 'trash' | 'restore' | 'purge';

/**
 * POST { slug, action }
 *  • trash   — у кошик: лекцію одразу не бачить ніхто, крім викладача (/teacher/trash);
 *  • restore — з кошика назад на сайт;
 *  • purge   — назавжди (лише з кошика): лекцію ховає назавжди, а її файли з репо прибирає
 *              GitHub Action purge-lectures (див. scripts/purge-lectures.mjs). Заодно закриває
 *              доступ учням до цієї лекції й вимикає публічні посилання на неї.
 *              Відповіді учнів у вправах не чіпає.
 */
export async function POST(req: Request) {
  const t = await teacher();
  if (!t) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const { slug, action } = (await req.json().catch(() => ({}))) as { slug?: string; action?: Action };
  if (!slug || !action || !['trash', 'restore', 'purge'].includes(action)) {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }

  const { data: row, error: readErr } = await t.supabase
    .from('lecture_trash')
    .select('slug, deleted_at, deleted_by, purged_at, file_hash')
    .eq('slug', slug)
    .maybeSingle<TrashRow>();
  if (readErr) {
    if (isMissingTable(readErr)) return NextResponse.json(NO_TABLE, { status: 503 });
    return NextResponse.json({ error: readErr.message }, { status: 500 });
  }

  if (action === 'trash') {
    if (!loadPage(slug)) return NextResponse.json({ error: 'not found' }, { status: 404 });
    if (row && !row.purged_at) return NextResponse.json({ ok: true });
    const { error } = await t.supabase.from('lecture_trash').upsert({
      slug,
      deleted_at: new Date().toISOString(),
      deleted_by: t.user.id,
      purged_at: null,
      file_hash: null,
    });
    if (error) return NextResponse.json(isMissingTable(error) ? NO_TABLE : { error: error.message }, { status: isMissingTable(error) ? 503 : 500 });
    return NextResponse.json({ ok: true });
  }

  if (!row) return NextResponse.json({ error: 'not in trash' }, { status: 404 });

  if (action === 'restore') {
    if (row.purged_at) return NextResponse.json({ error: 'already purged' }, { status: 409 });
    const { error } = await t.supabase.from('lecture_trash').delete().eq('slug', slug).is('purged_at', null);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // purge
  if (row.purged_at) return NextResponse.json({ ok: true, pending: isPendingPurge(row) });
  const hash = pageHash(slug);
  const { error } = await t.supabase
    .from('lecture_trash')
    .update({ purged_at: new Date().toISOString(), file_hash: hash })
    .eq('slug', slug);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  // учням лекцію більше не відкрито, посилання на неї не працюють
  await Promise.all([
    t.supabase.from('student_access').delete().match({ kind: 'lesson', ref: slug }),
    t.supabase.from('lecture_shares').update({ revoked_at: new Date().toISOString() }).eq('lesson_slug', slug).is('revoked_at', null),
  ]);
  return NextResponse.json({ ok: true, pending: !!hash });
}
