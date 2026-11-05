import { NextRequest, NextResponse } from 'next/server';
import { createAnonClient } from '@/lib/supabase/anon';
import {
  NotionClient,
  upsertResult,
  upsertStudent,
  type SaveItem,
  type SyncResult,
  type SyncStudent,
} from '@/lib/embed-results/notion-sync';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/embed/notion-sync { batch } — called by Supabase pg_cron (embed_sync_kick).
 * The batch uuid is a one-time capability: embed_sync_fetch returns data only for a
 * fresh, unused batch, so nobody else can read results through this endpoint.
 */
export async function POST(req: NextRequest) {
  let batch = '';
  try {
    batch = String(((await req.json()) as { batch?: unknown }).batch ?? '');
  } catch {
    /* empty */
  }
  if (!/^[0-9a-f-]{36}$/i.test(batch)) return NextResponse.json({ error: 'bad batch' }, { status: 400 });

  const token = process.env.NOTION_API_KEY || process.env.NOTION_TOKEN;
  if (!token) return NextResponse.json({ error: 'NOTION_API_KEY missing' }, { status: 500 });

  const supabase = createAnonClient();
  const { data, error } = await supabase.rpc('embed_sync_fetch', { p_batch: batch });
  if (error) return NextResponse.json({ error: 'db', detail: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'unknown batch' }, { status: 404 });

  const { students, results, more } = data as {
    students: SyncStudent[];
    results: SyncResult[];
    more: boolean;
  };
  const notion = new NotionClient(token);
  const saved: SaveItem[] = [];
  const errors: string[] = [];
  const studentPage = new Map<string, string>();

  for (const s of students ?? []) {
    try {
      const pageId = await upsertStudent(notion, s);
      studentPage.set(s.id, pageId);
      saved.push({ kind: 'student', key: s.id, notion_page_id: pageId, synced_upto: s.sync_upto });
    } catch (e) {
      errors.push(String(e).slice(0, 300));
      if (s.notion_page_id) studentPage.set(s.id, s.notion_page_id);
    }
  }

  for (const r of results ?? []) {
    const sp = studentPage.get(r.student_id);
    if (!sp) continue;
    try {
      const { pageId, detailId } = await upsertResult(notion, r, sp);
      saved.push({
        kind: 'result',
        key: `${r.student_id}|${r.lesson_id}|${r.embed}`,
        notion_page_id: pageId,
        detail_block_id: detailId,
        synced_upto: r.last_at,
      });
    } catch (e) {
      errors.push(String(e).slice(0, 300));
    }
  }

  if (saved.length) {
    const { error: saveErr } = await supabase.rpc('embed_sync_save', { p_batch: batch, p_items: saved });
    if (saveErr) errors.push(`save: ${saveErr.message}`);
  }

  // more left → ask the database to start the next batch right away
  if (more && !errors.length) {
    await supabase.rpc('embed_sync_kick', { p_force: false }).then(
      () => undefined,
      () => undefined
    );
  }

  return NextResponse.json(
    { students: students?.length ?? 0, results: results?.length ?? 0, saved: saved.length, more, errors },
    { status: errors.length && !saved.length ? 502 : 200 }
  );
}
