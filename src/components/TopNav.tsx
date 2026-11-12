import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { LogoutButton } from './LogoutButton';
import { NavLinks, type NavItem } from './NavLinks';
import { SearchPalette } from './SearchPalette';
import { MenuDrawer, MobileNav, type Tab } from './MobileNav';
import { ClassWatcher } from './class/ClassWatcher';

export async function TopNav() {
  // Preview deployments without Supabase env: render no nav instead of crashing every page.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return null;
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase.from('profiles').select('role, full_name').eq('id', user.id).single();
  const isTeacher = profile?.role === 'teacher';

  const items: NavItem[] = [
    { href: '/learn', label: 'Курс' },
    { href: isTeacher ? '/teacher/class' : '/class', label: 'Клас' },
    ...(isTeacher ? [{ href: '/teacher/students', label: 'Учні' }] : []),
    { href: '/words', label: 'Слова' },
    { href: '/dashboard', label: 'Прогрес' },
    ...(isTeacher ? [{ href: '/teacher', label: 'Кабінет викладача' }] : []),
  ];

  // телефон: 4 головні вкладки внизу, решта — у «Ще»
  const tabs: Tab[] = isTeacher
    ? [
        { href: '/learn', label: 'Курс', icon: 'book' },
        { href: '/teacher/class', label: 'Клас', icon: 'class' },
        { href: '/teacher/students', label: 'Учні', icon: 'users' },
        { href: '/words', label: 'Слова', icon: 'cards' },
      ]
    : [
        { href: '/learn', label: 'Курс', icon: 'book' },
        { href: '/class', label: 'Клас', icon: 'class' },
        { href: '/words', label: 'Слова', icon: 'cards' },
        { href: '/dashboard', label: 'Прогрес', icon: 'chart' },
      ];
  const more: Tab[] = isTeacher
    ? [
        { href: '/dashboard', label: 'Прогрес', icon: 'chart' },
        { href: '/teacher', label: 'Кабінет викладача', icon: 'desk' },
        { href: '/forgot-password', label: 'Змінити пароль', icon: 'key' },
      ]
    : [{ href: '/forgot-password', label: 'Змінити пароль', icon: 'key' }];

  return (
    <>
    {/* учень онлайн з будь-якої сторінки; коли викладач відкриє урок — сайт сам переведе в клас */}
    {!isTeacher && <ClassWatcher studentId={user.id} name={(profile?.full_name as string | null) ?? undefined} />}
    <header className="border-b border-ink-line bg-ink-raised/85 backdrop-blur">
      <div
        className="h-1"
        style={{ background: 'linear-gradient(90deg,#e4d9ff 0,#9adcc3 25%,#d3e9fb 50%,#f4b7c5 75%,#ded1ff 100%)' }}
      />
      <div className="mx-auto flex max-w-6xl items-center gap-x-6 gap-y-3 px-4 py-2.5 lg:flex-wrap lg:py-3">
        <MenuDrawer items={[...tabs, ...more]} />
        <Link href="/learn" className="group flex shrink-0 items-center gap-3" aria-label="Werba Way Language School — на головну">
          {/* знак з лого в кільці того ж градієнта, що й на лого */}
          <span
            className="grid h-10 w-10 place-items-center md:h-12 md:w-12 rounded-full p-[2px] shadow-sm transition-transform duration-300 group-hover:-rotate-6"
            style={{ background: 'linear-gradient(135deg,#1d3a8a 0%,#6b2c91 35%,#e2363f 68%,#f6b53a 100%)' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/werba-mark.png" alt="" width={44} height={44} className="h-full w-full rounded-full bg-white" />
          </span>
          <span className="leading-none" aria-hidden="true">
            <span className="block text-[15px] font-semibold tracking-[0.14em] md:text-[17px] md:tracking-[0.16em]">
              <span style={{ color: '#151c3c' }}>WERBA</span> <span style={{ color: '#a98bea' }}>WAY</span>
            </span>
            <span className="mt-1.5 hidden items-center gap-1.5 text-[9px] sm:flex font-medium tracking-[0.24em] text-paper-muted">
              <span className="h-px w-3 bg-[#a98bea]" />
              LANGUAGE SCHOOL
              <span className="h-px w-3 bg-[#a98bea]" />
            </span>
          </span>
        </Link>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
          <SearchPalette teacher={isTeacher} />
          <div className="hidden min-w-0 items-center gap-3 lg:flex">
            <NavLinks items={items} />
            <LogoutButton />
          </div>
        </div>
      </div>
    </header>
    <MobileNav tabs={tabs} more={more} />
    </>
  );
}
