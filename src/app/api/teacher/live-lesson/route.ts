import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { buildHomeworkPages, buildPages, loadPage } from '@/lib/pages/pages';
import { lessonSlugOf } from '@/lib/live/protocol';
import { sharedSlug } from '@/lib/share';
import { getLocale } from '@/i18n/server';

export const dynamic = 'force-dynamic';

/**
 * Сторінки лекції, яку зараз відкрив учень, — для «Дивитися»: викладач сам гортає вправи,
 * поки учень лишається там, де він є. `path` — шлях учня з присутності:
 * /learn/<slug>[/hw] або /s/<токен>[/hw] (гість за посиланням).
 */
export async function GET(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (me?.role !== 'teacher') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const path = new URL(req.url).searchParams.get('path') ?? '';
  const token = /^\/s\/([A-Za-z0-9_-]{8,40})(\/hw)?\/?$/.exec(path)?.[1];
  const slug = token ? await sharedSlug(token) : lessonSlugOf(path);
  const page = slug ? loadPage(slug, getLocale()) : null;
  if (!page) return NextResponse.json({ error: 'not found' }, { status: 404 });
  // учень у домашці (/hw) — віддаємо її сторінки, а не лекції
  const hw = /\/hw\/?$/.test(path);
  return NextResponse.json({ slug: page.meta.slug, title: page.meta.title, pages: hw ? buildHomeworkPages(page) : buildPages(page) });
}
