import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { canSee, getAccess } from '@/lib/pages/access';
import { courses, decks, lectures, norm, snippet, teacherNotes } from '@/lib/search';

export const dynamic = 'force-dynamic';

type Item = { title: string; sub?: string; href: string; icon: string };
type Group = { label: string; items: Item[] };

const SECTIONS = (teacher: boolean): Item[] => [
  { title: 'Курс', sub: 'усі лекції', href: '/learn', icon: '📚' },
  { title: 'Слова', sub: 'колоди й тренування', href: '/words', icon: '🔤' },
  { title: 'Прогрес', sub: teacher ? 'мій дашборд' : 'мої результати', href: '/dashboard', icon: '📈' },
  { title: 'Клас', sub: teacher ? 'учні й заняття наживо' : 'заняття з викладачем', href: teacher ? '/teacher/class' : '/class', icon: '🧑‍🏫' },
  ...(teacher
    ? [
        { title: 'Учні', sub: 'дашборд і профілі', href: '/teacher/students', icon: '👥' },
        { title: 'Кабінет викладача', href: '/teacher', icon: '🗂️' },
        { title: 'Результати вправ', href: '/teacher/results', icon: '📝' },
        { title: 'Аналітика', href: '/teacher/analytics', icon: '📊' },
      ]
    : []),
];

/** GET /api/search?q= — лекції, курси, учні (викладач), нотатки (викладач), слова, розділи */
export async function GET(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const raw = (new URL(req.url).searchParams.get('q') ?? '').slice(0, 80);
  const q = norm(raw);
  const access = await getAccess(supabase, user.id);
  const teacher = access.isTeacher;
  const sections = SECTIONS(teacher);
  if (q.length < 2) return NextResponse.json({ groups: [{ label: 'Розділи', items: sections }] });

  const words = q.split(' ').filter(Boolean);
  const all = (s: string) => words.every((w) => s.includes(w));
  const groups: Group[] = [];

  // лекції: спершу збіг у назві, потім у тексті
  const visible = lectures().filter((l) => canSee(l.meta, access));
  const byTitle = visible.filter((l) => all(l.title));
  const byText = visible.filter((l) => !all(l.title) && l.text.includes(q));
  const lectureItems: Item[] = [
    ...byTitle.slice(0, 8).map((l) => ({
      title: l.meta.title,
      sub: [l.meta.moduleTitle, l.meta.level].filter(Boolean).join(' · '),
      href: `/learn/${l.meta.slug}`,
      icon: l.meta.icon ?? '📘',
    })),
    ...byText.slice(0, Math.max(0, 8 - byTitle.length)).map((l) => ({
      title: l.meta.title,
      sub: snippet(l.text, q),
      href: `/learn/${l.meta.slug}`,
      icon: l.meta.icon ?? '📘',
    })),
  ];
  if (lectureItems.length) groups.push({ label: 'Лекції', items: lectureItems });

  const courseItems = courses()
    .filter((c) => c.code && all(norm(c.title)) && c.pages.some((p) => canSee(p, access)))
    .slice(0, 5)
    .map((c) => ({ title: c.title, sub: `${c.pages.length} лекцій`, href: `/learn#course-${c.code}`, icon: '🗂️' }));
  if (courseItems.length) groups.push({ label: 'Курси', items: courseItems });

  if (teacher) {
    const [{ data: stats }, { data: profiles }] = await Promise.all([
      supabase.from('embed_student_stats').select('id, name, user_id, archived_at'),
      supabase.from('profiles').select('id, full_name, role'),
    ]);
    const seen = new Set<string>();
    const people: Item[] = [];
    for (const p of profiles ?? []) {
      if (p.role === 'teacher' || !p.full_name || !all(norm(p.full_name as string))) continue;
      seen.add(p.id as string);
      people.push({ title: p.full_name as string, sub: 'учень з акаунтом', href: `/teacher/students/${p.id}`, icon: '👤' });
    }
    for (const s of stats ?? []) {
      if (s.archived_at || (s.user_id && seen.has(s.user_id as string)) || !all(norm((s.name as string) ?? ''))) continue;
      if (s.user_id) continue; // акаунт без імені в профілі — пропускаємо
      people.push({ title: s.name as string, sub: 'лише Notion', href: `/teacher/students/${s.id}`, icon: '👤' });
    }
    // учні — найчастіший пошук викладача, тож першими
    if (people.length) groups.unshift({ label: 'Учні', items: people.slice(0, 6) });

    const notes = teacherNotes()
      .filter((t) => all(t.n))
      .slice(0, 5)
      .map((t) => ({ title: t.meta.title, sub: 'нотатки викладача', href: `/teacher/lesson/${t.meta.teacherOf ?? t.meta.slug}`, icon: '📋' }));
    if (notes.length) groups.push({ label: 'Нотатки до уроків', items: notes });
  }

  // слова — з колод доступних лекцій
  const visibleSlugs = new Set(visible.map((l) => l.meta.slug));
  const wordItems: Item[] = [];
  for (const d of decks()) {
    if (!visibleSlugs.has(d.slug)) continue;
    for (const w of d.words) {
      if (wordItems.length >= 6) break;
      if (all(w.n)) wordItems.push({ title: w.term, sub: w.tr, href: `/words/play?decks=${d.slug}&mode=cards`, icon: '🔤' });
    }
    if (wordItems.length >= 6) break;
  }
  if (wordItems.length) groups.push({ label: 'Слова', items: wordItems });

  const sec = sections.filter((s) => all(norm(`${s.title} ${s.sub ?? ''}`)));
  if (sec.length) groups.push({ label: 'Розділи', items: sec });

  return NextResponse.json({ groups });
}
