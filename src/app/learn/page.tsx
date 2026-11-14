import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { groupByCourse, listPages } from '@/lib/pages/pages';
import { getLocale, t } from '@/i18n/server';
import { canSee, getAccess } from '@/lib/pages/access';
import { lectures } from '@/content/lectures';
import { CourseGroup } from '@/components/lesson/CourseGroup';

export const dynamic = 'force-dynamic';

export default async function LearnIndex() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/learn');

  const access = await getAccess(supabase, user.id);
  const pages = listPages(getLocale()).filter((p) => canSee(p, access));
  // старі інтерактивні лекції («Кіно») — тільки призначені учневі
  const { data: assigned } = await supabase.from('assignments').select('lecture_slug').eq('student_id', user.id);
  const assignedSet = new Set((assigned ?? []).map((a) => a.lecture_slug as string));
  const extraLectures = lectures.filter((l) => access.isTeacher || assignedSet.has(l.slug));
  // по курсах: де більше лекцій — вище
  const groups = groupByCourse(pages);
  return (
    <main className="mx-auto max-w-5xl px-4 py-14">
      <h1 className="mb-2 font-display text-4xl text-paper">{t("Курс")}</h1>
      <p className="mb-10 text-paper-muted">{t("Лекції з текстами, вправами й домашкою.")}</p>
      {pages.length === 0 && extraLectures.length === 0 && (
        <p className="text-paper-muted">{t("Тут з’являться лекції, щойно викладач відкриє тобі курс.")}</p>
      )}
      {extraLectures.length > 0 && (
        <section className="mb-12">
          <h2 className="mb-4 font-display text-2xl text-paper">{t("Інтерактивні лекції")}</h2>
          <div className="flex flex-wrap gap-3">
            {extraLectures.map((l) => (
              <Link key={l.slug} href={`/lectures/${l.slug}`} className="ww-btn ww-btn-secondary ww-btn-lg">
                {l.title}
              </Link>
            ))}
          </div>
        </section>
      )}
      {groups.map((g) => (
        <CourseGroup
          key={g.title}
          canShare={access.isTeacher}
          id={`course-${g.code || 'other'}`}
          title={g.title}
          pages={g.pages.map((p) => ({ slug: p.slug, title: p.title, icon: p.icon, cover: p.cover, level: p.level, number: p.number }))}
        />
      ))}
    </main>
  );
}
