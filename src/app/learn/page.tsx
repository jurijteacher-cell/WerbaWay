import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { groupByCourse, listPages } from '@/lib/pages/pages';
import { applyCourseOverrides } from '@/lib/pages/course';
import { getLocale, t } from '@/i18n/server';
import { canSee, getAccess } from '@/lib/pages/access';
import { lectures } from '@/content/lectures';
import { LearnCategories, type LearnCategory } from '@/components/lesson/LearnCategories';
import { CATEGORIES, categoryOf, type CategoryId } from '@/lib/pages/categories';

export const dynamic = 'force-dynamic';

export default async function LearnIndex({ searchParams }: { searchParams?: { cat?: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/learn');

  const access = await getAccess(supabase, user.id);
  const pages = applyCourseOverrides(listPages(getLocale()), access.courses).filter((p) => canSee(p, access));
  // старі інтерактивні лекції («Кіно») — тільки призначені учневі
  const { data: assigned } = await supabase.from('assignments').select('lecture_slug').eq('student_id', user.id);
  const assignedSet = new Set((assigned ?? []).map((a) => a.lecture_slug as string));
  const extraLectures = lectures.filter((l) => access.isTeacher || assignedSet.has(l.slug));
  // по курсах: де більше лекцій — вище
  const groups = groupByCourse(pages);
  // усі категорії — для кнопки «Перенести» (лише викладач; кошик не рахуємо)
  const courseOptions = access.isTeacher ? groups.map((g) => ({ code: g.code, title: g.title })) : [];
  // категорії: A0 → B2, далі спеціальні задачі; порожні не показуємо
  const categories: LearnCategory[] = CATEGORIES.map((c) => ({
    ...c,
    groups: groups
      .filter((g) => categoryOf(g.code, g.pages.map((p) => p.level)) === c.id)
      .map((g) => ({
        code: g.code,
        title: g.title,
        pages: g.pages.map((p) => ({ slug: p.slug, title: p.title, icon: p.icon, cover: p.cover, level: p.level, number: p.number })),
      })),
  })).filter((c) => c.groups.length > 0);
  const initial = categories.some((c) => c.id === searchParams?.cat) ? (searchParams?.cat as CategoryId) : null;
  return (
    <main className="mx-auto max-w-5xl px-4 py-14">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-display text-4xl text-paper">{t("Курс")}</h1>
        {access.isTeacher && (
          <Link href="/teacher/trash" className="ww-btn ww-btn-ghost ww-btn-sm">
            🗑 {t("Кошик")}
            {access.trashed.size > 0 && ` (${access.trashed.size})`}
          </Link>
        )}
      </div>
      <p className="mb-8 text-paper-muted">{t("Лекції з текстами, вправами й домашкою.")}</p>
      {pages.length === 0 && extraLectures.length === 0 && (
        <p className="text-paper-muted">{t("Тут з’являться лекції, щойно викладач відкриє тобі курс.")}</p>
      )}
      <LearnCategories
        categories={categories}
        initial={initial}
        canShare={access.isTeacher}
        courseOptions={courseOptions}
      />
      {extraLectures.length > 0 && (
        <section className="mt-14 border-t border-ink-line pt-8">
          <h2 className="mb-4 font-display text-xl text-paper">{t("Інтерактивні лекції")}</h2>
          <div className="flex flex-wrap gap-3">
            {extraLectures.map((l) => (
              <Link key={l.slug} href={`/lectures/${l.slug}`} className="ww-btn ww-btn-secondary ww-btn-lg">
                {l.title}
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
