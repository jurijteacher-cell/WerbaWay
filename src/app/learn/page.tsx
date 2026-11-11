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
    <main className="mx-auto max-w-3xl px-4 py-16">
      <p className="font-mono text-xs uppercase tracking-widest text-gold-dim">Werba Way</p>
      <h1 className="mb-8 font-display text-4xl text-paper">Уроки</h1>
      <div className="flex flex-col gap-3">
        {pages.map((p) => (
          <Link
            key={p.slug}
            href={`/learn/${p.slug}`}
            className="group rounded-xl border border-ink-line bg-ink-raised px-5 py-4 transition-colors hover:border-gold"
          >
            <p className="font-mono text-xs uppercase tracking-widest text-gold-dim">
              {p.level}
              {p.number != null && ` · урок ${p.number}`}
            </p>
            <h2 className="mt-1 font-display text-xl text-paper group-hover:text-gold-bright">
              {p.icon} {p.title}
            </h2>
          </Link>
        ))}
        {pages.length === 0 && <p className="text-paper-muted">Поки порожньо.</p>}
      </div>
    </main>
  );
}
