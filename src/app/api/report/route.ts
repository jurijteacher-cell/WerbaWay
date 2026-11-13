import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    message?: string;
    pageUrl?: string;
    lessonSlug?: string | null;
    context?: unknown;
  };
  const message = (body.message ?? '').trim().slice(0, 4000);
  if (!message) return NextResponse.json({ error: 'empty' }, { status: 400 });

  const { error } = await supabase.from('bug_reports').insert({
    reporter_id: user.id,
    message,
    page_url: (body.pageUrl ?? '').slice(0, 500) || null,
    lesson_slug: body.lessonSlug ?? null,
    context: body.context ?? null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
