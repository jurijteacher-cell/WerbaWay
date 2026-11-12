import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { LogoutButton } from './LogoutButton';
import { NavLinks, type NavItem } from './NavLinks';

export async function TopNav() {
  // Preview deployments without Supabase env: render no nav instead of crashing every page.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return null;
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  const isTeacher = profile?.role === 'teacher';

  const items: NavItem[] = [
    { href: '/learn', label: 'Курс' },
    { href: isTeacher ? '/teacher/class' : '/class', label: 'Клас' },
    { href: '/words', label: 'Слова' },
    { href: '/dashboard', label: 'Прогрес' },
    { href: '/', label: 'Уроки', exact: true },
    { href: '/lectures', label: 'Лекції' },
    ...(isTeacher ? [{ href: '/teacher', label: 'Кабінет викладача' }] : []),
  ];

  return (
    <header className="border-b border-ink-line bg-ink-raised/85 backdrop-blur">
      <div
        className="h-1"
        style={{ background: 'linear-gradient(90deg,#ffe168 0,#a9dcc6 25%,#bcdcf2 50%,#f6c2af 75%,#d8cff0 100%)' }}
      />
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
        <Link href="/learn" className="group flex shrink-0 items-center gap-3" aria-label="Werba Way — на головну">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/werba-logo.jpg"
            alt=""
            width={44}
            height={44}
            className="h-11 w-11 rounded-full border border-ink-line bg-white shadow-sm transition-transform duration-300 group-hover:-rotate-6"
          />
          <span className="leading-tight">
            <span className="block font-display text-lg text-paper">Werba Way</span>
            <span className="block text-[11px] text-paper-muted">Language school</span>
          </span>
        </Link>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
          <NavLinks items={items} />
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
