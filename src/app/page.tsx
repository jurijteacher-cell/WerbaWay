import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { lessons } from '@/content/lessons';
import { LogoutButton } from '@/components/LogoutButton';

export default async function HomePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <div className="mb-12 flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-widest text-gold-dim">Werba Way</p>
          <h1 className="font-display text-3xl text-paper">Твої уроки</h1>
        </div>
        <LogoutButton />
      </div>

      <div className="flex flex-col gap-3">
        {lessons.map((lesson) => (
          <Link
            key={lesson.slug}
            href={`/lessons/${lesson.slug}`}
            className="group rounded-xl border border-ink-line bg-ink-raised px-6 py-5 transition-colors hover:border-gold"
          >
            <h2 className="font-display text-xl text-paper group-hover:text-gold-bright">{lesson.title}</h2>
            {lesson.subtitle && <p className="mt-1 text-paper-muted">{lesson.subtitle}</p>}
          </Link>
        ))}
      </div>
    </main>
  );
}
