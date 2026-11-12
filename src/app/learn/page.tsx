import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { groupByCourse, listPages } from '@/lib/pages/pages';
import { canSee, getAccess } from '@/lib/pages/access';
import { lectures } from '@/content/lectures';

export const dynamic = 'force-dynamic';

export default async function LearnIndex() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/learn');

  const access = await getAccess(supabase, user.id);
  const pages = listPages().filter((p) => canSee(p, access));
  // старі інтерактивні лекції («Кіно») — тільки призначені учневі
  const { data: assigned } = await supabase.from('assignments').select('lecture_slug').eq('student_id', user.id);
  const assignedSet = new Set((assigned ?? []).map((a) => a.lecture_slug as string));
  const extraLectures = lectures.filter((l) => access.isTeacher || assignedSet.has(l.slug));
  // по курсах: де більше лекцій — вище
  const groups = groupByCourse(pages);
  return (
    <main className="mx-auto max-w-5xl px-4 py-14">
      <h1 className="mb-2 font-display text-4xl text-paper">Курс</h1>
      <p className="mb-10 text-paper-muted">Лекції з текстами, вправами й домашкою.</p>
      {pages.length === 0 && extraLectures.length === 0 && (
        <p className="text-paper-muted">Тут з’являться лекції, щойно викладач відкриє тобі курс.</p>
      )}
      {extraLectures.length > 0 && (
        <section className="mb-12">
          <h2 className="mb-4 font-display text-2xl text-paper">Інтерактивні лекції</h2>
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
        <section key={g.title} className="mb-12">
          <h2 className="mb-4 font-display text-2xl text-paper">
            {g.title} <span className="text-base font-normal text-paper-muted">{g.pages.length}</span>
          </h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {g.pages.map((p) => (
              <Link
                key={p.slug}
                href={`/learn/${p.slug}`}
                className="group overflow-hidden rounded-2xl border border-ink-line bg-ink-raised transition-colors hover:border-gold"
              >
                <div className="relative">
                  {p.cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.cover} alt="" loading="lazy" className="h-36 w-full object-cover" />
                  ) : (
                    <div className="h-36 w-full bg-ink-soft" />
                  )}
                  <span
                    aria-hidden="true"
                    className="absolute -bottom-5 left-4 grid h-11 w-11 -rotate-3 place-items-center rounded-xl border border-ink-line bg-ink-raised text-2xl shadow-sm"
                  >
                    {p.icon ?? '📘'}
                  </span>
                </div>
                <div className="px-4 pb-4 pt-7">
                  <h3 className="font-display text-lg leading-snug text-paper group-hover:text-gold-bright">{p.title}</h3>
                  <p className="mt-1 text-sm text-paper-muted">
                    {[p.level, p.number != null ? `урок ${p.number}` : null].filter(Boolean).join(', ')}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
