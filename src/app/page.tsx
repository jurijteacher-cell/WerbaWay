import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { lessons } from '@/content/lessons';

export default async function HomePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const visibleLessons = lessons.filter((l) => !l.hideFromBrowse);
  const categories = Array.from(new Set(visibleLessons.map((l) => l.category || 'Інше')));

  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <div className="mb-12">
        <p className="text-sm uppercase tracking-widest text-gold-dim">Werba Way</p>
        <h1 className="font-display text-3xl text-paper">Твої уроки</h1>
      </div>

      <div className="flex flex-col gap-10">
        {categories.map((category) => (
          <section key={category}>
            <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-gold-dim">{category}</h2>
            <div className="flex flex-col gap-3">
              {visibleLessons
                .filter((l) => (l.category || 'Інше') === category)
                .map((lesson) => (
                  <Link
                    key={lesson.slug}
                    href={`/lessons/${lesson.slug}`}
                    className="group rounded-xl border border-ink-line bg-ink-raised px-6 py-5 transition-colors hover:border-gold"
                  >
                    <h3 className="font-display text-xl text-paper group-hover:text-gold-bright">{lesson.title}</h3>
                    {lesson.subtitle && <p className="mt-1 text-paper-muted">{lesson.subtitle}</p>}
                  </Link>
                ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
