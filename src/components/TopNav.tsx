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
    ...(isTeacher ? [{ href: '/teacher', label: 'Кабінет викладача' }] : []),
  ];

  return (
    <header className="border-b border-ink-line bg-ink-raised/85 backdrop-blur">
      <div
        className="h-1"
        style={{ background: 'linear-gradient(90deg,#ffe168 0,#a9dcc6 25%,#bcdcf2 50%,#f6c2af 75%,#d8cff0 100%)' }}
      />
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
        <Link href="/learn" className="group flex shrink-0 items-center gap-3" aria-label="Werba Way Language School — на головну">
          {/* знак з лого в кільці того ж градієнта, що й на лого */}
          <span
            className="grid h-12 w-12 place-items-center rounded-full p-[2px] shadow-sm transition-transform duration-300 group-hover:-rotate-6"
            style={{ background: 'linear-gradient(135deg,#1d3a8a 0%,#6b2c91 35%,#e2363f 68%,#f6b53a 100%)' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/werba-mark.png" alt="" width={44} height={44} className="h-full w-full rounded-full bg-white" />
          </span>
          <span className="leading-none" aria-hidden="true">
            <span className="block text-[17px] font-semibold tracking-[0.16em]">
              <span style={{ color: '#13213f' }}>WERBA</span> <span style={{ color: '#b8964f' }}>WAY</span>
            </span>
            <span className="mt-1.5 flex items-center gap-1.5 text-[9px] font-medium tracking-[0.24em] text-paper-muted">
              <span className="h-px w-3 bg-[#b8964f]" />
              LANGUAGE SCHOOL
              <span className="h-px w-3 bg-[#b8964f]" />
            </span>
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
