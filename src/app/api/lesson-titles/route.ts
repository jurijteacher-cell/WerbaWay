import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { lessonTitle } from '@/lib/lesson-titles';

export const dynamic = 'force-dynamic';

/** Назви лекцій за slug-ами — для чипів у чаті. Потрібен вхід. */
export async function GET(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const slugs = (new URL(req.url).searchParams.get('slugs') ?? '')
    .split(',')
    .filter((s) => /^[a-z0-9][a-z0-9-]*$/.test(s))
    .slice(0, 50);
  return NextResponse.json({ titles: Object.fromEntries(slugs.map((s) => [s, lessonTitle(s)])) });
}
