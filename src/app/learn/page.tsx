import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { listPages } from '@/lib/pages/pages';

export const dynamic = 'force-dynamic';

export default async function LearnIndex() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/learn');

  const pages = listPages();
  return (
    <main className="mx-auto max-w-5xl px-4 py-14">
      <h1 className="mb-2 font-display text-4xl text-paper">Уроки</h1>
      <p className="mb-8 text-paper-muted">Лекції курсу з текстами, вправами й домашкою.</p>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {pages.map((p) => (
          <Link
            key={p.slug}
            href={`/learn/${p.slug}`}
            className="group overflow-hidden rounded-2xl border border-ink-line bg-ink-raised transition-colors hover:border-gold"
          >
            <div className="relative">
              {p.cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.cover} alt="" className="h-36 w-full object-cover" />
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
              <h2 className="font-display text-lg leading-snug text-paper group-hover:text-gold-bright">{p.title}</h2>
              <p className="mt-1 text-sm text-paper-muted">
                {[p.level, p.moduleTitle, p.number != null ? `урок ${p.number}` : null].filter(Boolean).join(', ')}
              </p>
            </div>
          </Link>
        ))}
        {pages.length === 0 && <p className="text-paper-muted">Поки порожньо.</p>}
      </div>
    </main>
  );
}
