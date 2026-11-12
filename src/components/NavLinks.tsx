'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export type NavItem = { href: string; label: string; exact?: boolean };

/** Пункти меню: окремі кнопки, поточна сторінка підсвічена маркером */
export function NavLinks({ items }: { items: NavItem[] }) {
  const path = usePathname() ?? '/';
  const isOn = (it: NavItem) => (it.exact ? path === it.href : path === it.href || path.startsWith(`${it.href}/`));
  // якщо підходить кілька пунктів (/teacher і /teacher/class) — підсвічуємо найдовший
  const active = items.filter(isOn).sort((a, b) => b.href.length - a.href.length)[0]?.href;
  return (
    <nav aria-label="Головне меню" className="ww-nav max-w-full overflow-x-auto [scrollbar-width:none]">
      {items.map((it) => (
        <Link key={it.href} href={it.href} className="ww-nav-link" aria-current={it.href === active ? 'page' : undefined}>
          {it.label}
        </Link>
      ))}
    </nav>
  );
}
