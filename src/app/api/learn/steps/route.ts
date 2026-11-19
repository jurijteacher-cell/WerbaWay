import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { buildSteps, loadPage } from '@/lib/pages/pages';
import { getLocale } from '@/i18n/server';
import { getAccess } from '@/lib/pages/access';

export const dynamic = 'force-dynamic';

/** Кроки лекції для бокової навігації в класі */
export async function GET(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const slug = new URL(req.url).searchParams.get('slug') ?? '';
  const page = loadPage(slug, getLocale());
  if (!page) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const access = await getAccess(supabase, user.id);
  if (access.trashed.has(slug) && !access.isTeacher) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ title: page.meta.title, hasHomework: page.hasHomework, steps: buildSteps(page) });
}
