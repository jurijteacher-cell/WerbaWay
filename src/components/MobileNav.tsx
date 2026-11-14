'use client';


import { useT } from '@/i18n/client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/lib/supabase/client';
import { Mark } from '@/components/Mark';

export type TabIcon = 'book' | 'class' | 'users' | 'cards' | 'chart' | 'desk' | 'key';
export type Tab = { href: string; label: string; icon: TabIcon };

/**
 * Телефон: нижня панель вкладок (як у застосунку) + «Ще» з рештою пунктів і виходом.
 * На ширших екранах не показується — там меню в шапці.
 */
export function MobileNav({ tabs, more }: { tabs: Tab[]; more: Tab[] }) {
  const t = useT();
  const path = usePathname() ?? '/';
  const [open, setOpen] = useState(false);
  const all = [...tabs, ...more];
  const active = all
    .filter((t) => path === t.href || path.startsWith(`${t.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
  const moreActive = more.some((t) => t.href === active);

  useEffect(() => setOpen(false), [path]);

  return (
    <>
      <nav className="ww-tabbar lg:hidden" aria-label={t("Головне меню")}>
        {tabs.map((t) => (
          <Link key={t.href} href={t.href} className="ww-tab" aria-current={t.href === active ? 'page' : undefined}>
            <Icon name={t.icon} />
            <span>{t.label}</span>
          </Link>
        ))}
        <button
          type="button"
          className="ww-tab"
          aria-current={moreActive ? 'page' : undefined}
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          <Icon name="more" />
          <span>{t("Ще")}</span>
        </button>
      </nav>
      {open && createPortal(<MoreSheet items={more} active={active} onClose={() => setOpen(false)} />, document.body)}
    </>
  );
}

function MoreSheet({ items, active, onClose }: { items: Tab[]; active?: string; onClose: () => void }) {
  const t = useT();
  const router = useRouter();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function logout() {
    await createClient().auth.signOut();
    onClose();
    router.push('/login');
    router.refresh();
  }

  return (
    <div className="ww-sheet-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="ww-sheet" role="dialog" aria-modal="true" aria-label={t("Інші розділи")}>
        <span className="ww-sheet-grip" aria-hidden="true" />
        <ul className="space-y-1">
          {items.map((t) => (
            <li key={t.href}>
              <Link href={t.href} className="ww-sheet-link" aria-current={t.href === active ? 'page' : undefined} onClick={onClose}>
                <Icon name={t.icon} />
                {t.label}
              </Link>
            </li>
          ))}
        </ul>
        <button type="button" onClick={() => void logout()} className="ww-btn ww-btn-secondary mt-3 w-full">
          Вийти з акаунта
        </button>
      </div>
    </div>
  );
}

/**
 * Кнопка ☰ зліва в шапці (коли повне меню не вміщується) і бічна панель з усіма розділами.
 */
export function MenuDrawer({ items }: { items: Tab[] }) {
  const t = useT();
  const path = usePathname() ?? '/';
  const [open, setOpen] = useState(false);
  const active = items
    .filter((t) => path === t.href || path.startsWith(`${t.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  useEffect(() => setOpen(false), [path]);

  return (
    <>
      <button
        type="button"
        className="ww-burger lg:hidden"
        aria-label={t("Відкрити меню")}
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <span />
        <span />
        <span />
      </button>
      {open && createPortal(<Drawer items={items} active={active} onClose={() => setOpen(false)} />, document.body)}
    </>
  );
}

function Drawer({ items, active, onClose }: { items: Tab[]; active?: string; onClose: () => void }) {
  const t = useT();
  const router = useRouter();
  const [closing, setClosing] = useState(false);
  const close = () => {
    setClosing(true);
    setTimeout(onClose, 200);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.querySelector<HTMLElement>('.ww-drawer a')?.focus();
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  async function logout() {
    await createClient().auth.signOut();
    onClose();
    router.push('/login');
    router.refresh();
  }

  return (
    <div
      className={`ww-drawer-backdrop${closing ? ' is-closing' : ''}`}
      role="presentation"
      onMouseDown={(e) => e.target === e.currentTarget && close()}
    >
      <aside className="ww-drawer" role="dialog" aria-modal="true" aria-label={t("Меню")}>
        <div className="mb-5 flex items-center justify-between">
          <span className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <Mark size={36} className="rounded-full" />
            <span className="text-[15px] font-semibold tracking-[0.14em]">
              <span style={{ color: '#151c3c' }}>WERBA</span> <span style={{ color: '#a98bea' }}>WAY</span>
            </span>
          </span>
          <button type="button" onClick={close} className="ww-btn ww-btn-ghost ww-btn-sm" aria-label={t("Закрити меню")}>
            ✕
          </button>
        </div>
        <nav aria-label={t("Головне меню")}>
          <ul className="space-y-1">
            {items.map((t, i) => (
              <li key={t.href} style={{ animationDelay: `${60 + i * 35}ms` }} className="ww-drawer-item">
                <Link href={t.href} className="ww-sheet-link" aria-current={t.href === active ? 'page' : undefined} onClick={onClose}>
                  <Icon name={t.icon} />
                  {t.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <button type="button" onClick={() => void logout()} className="ww-btn ww-btn-secondary mt-auto w-full">
          Вийти з акаунта
        </button>
      </aside>
    </div>
  );
}

const PATHS: Record<TabIcon | 'more', JSX.Element> = {
  book: (
    <>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" />
      <path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5" />
    </>
  ),
  class: (
    <>
      <rect x="2.5" y="4" width="19" height="13" rx="2.5" />
      <path d="M8 21h8M12 17v4M9.5 8.5l5 2-5 2z" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5" />
      <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 14.8c1.7.8 2.7 2.5 3 5.2" />
    </>
  ),
  cards: (
    <>
      <rect x="7" y="3" width="14" height="17" rx="2.5" />
      <path d="M4 7.5v11A2.5 2.5 0 0 0 6.5 21H15" />
      <path d="M11 9.5h6M11 13h4" />
    </>
  ),
  chart: (
    <>
      <path d="M3 20.5h18" />
      <rect x="5" y="11" width="3.2" height="7" rx="1" />
      <rect x="10.4" y="6" width="3.2" height="12" rx="1" />
      <rect x="15.8" y="13" width="3.2" height="5" rx="1" />
    </>
  ),
  desk: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2.5" />
      <path d="M8.5 7V5.5A2 2 0 0 1 10.5 3.5h3a2 2 0 0 1 2 2V7M3 12.5h18" />
    </>
  ),
  key: (
    <>
      <circle cx="8" cy="15" r="4.5" />
      <path d="m11.2 11.8 8.3-8.3M16.5 6.5l2.5 2.5M14 9l2 2" />
    </>
  ),
  more: (
    <>
      <circle cx="5" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="19" cy="12" r="1.6" />
    </>
  ),
};

function Icon({ name }: { name: TabIcon | 'more' }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name]}
    </svg>
  );
}
