import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { loadTeacherPage } from '@/lib/pages/pages';

export const dynamic = 'force-dynamic';

/** Нотатки викладача до лекції — для бічної панелі в класі. Лише для викладача. */
export async function GET(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { data: teacher } = await supabase.rpc('is_teacher');
  if (!teacher) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const slug = new URL(req.url).searchParams.get('slug') ?? '';
  const page = loadTeacherPage(slug);
  if (!page) return NextResponse.json({ notes: null });
  // вправи в нотатках — посиланням (вони й так відкриті в учня)
  const html = [
    page.goal ?? '',
    ...page.sections.flatMap((s) =>
      s.blocks.map((b) =>
        b.k === 'html'
          ? b.html
          : b.k === 'embed'
            ? `<p class="lp-notes-embed">🧩 <a href="${b.src}" target="_blank" rel="noopener">${b.title}</a></p>`
            : `<p class="lp-notes-embed">▶️ <a href="https://www.youtube.com/watch?v=${b.id}" target="_blank" rel="noopener">${b.title}</a></p>`
      )
    ),
  ].join('\n');
  return NextResponse.json({ notes: { title: page.meta.title, html } });
}
