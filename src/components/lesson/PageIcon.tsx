import type { ReactNode } from 'react';
import type { BookPage } from '@/lib/pages/pages';

/**
 * Лінійні іконки сторінок лекції (24×24, обведення 1.8, кольором тексту) — замість емодзі в навігації.
 * Набір і правила — docs/DESIGN_SYSTEM.md, «Іконки сторінок».
 */
export type PageIconName =
  | 'text'
  | 'goal'
  | 'cards'
  | 'pencil'
  | 'exam'
  | 'chat'
  | 'slides'
  | 'picture'
  | 'home'
  | 'note'
  | 'play'
  | 'glossary'
  | 'link'
  | 'other';

const PATHS: Record<PageIconName, ReactNode> = {
  text: <path d="M12 6.6C10 5 7 4.5 3.5 5v13.2c3.5-.5 6.5 0 8.5 1.6 2-1.6 5-2.1 8.5-1.6V5C17 4.5 14 5 12 6.6zM12 6.6v13.2" />,
  goal: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.8" />
      <circle cx="12" cy="12" r="1.2" />
    </>
  ),
  cards: (
    <>
      <rect x="3.5" y="7.5" width="12.5" height="13" rx="2.2" />
      <path d="M8 4h10.3a2.2 2.2 0 0 1 2.2 2.2V16.5" />
    </>
  ),
  pencil: <path d="M4.5 19.5l1-4.4L15.6 5a2.1 2.1 0 0 1 3 3L8.6 18.4zM13.6 7l3 3" />,
  exam: (
    <>
      <rect x="5" y="4.5" width="14" height="16.5" rx="2.4" />
      <path d="M9.2 3h5.6v3H9.2zM9 13.4l2.1 2.1 4-4.4" />
    </>
  ),
  chat: (
    <path d="M4 5h10.5A1.5 1.5 0 0 1 16 6.5v6a1.5 1.5 0 0 1-1.5 1.5H9l-3.5 3v-3H4a1.5 1.5 0 0 1-1.5-1.5v-6A1.5 1.5 0 0 1 4 5zM19 9h.5A1.5 1.5 0 0 1 21 10.5v6a1.5 1.5 0 0 1-1.5 1.5h-.5v2.5L16 18h-3.5" />
  ),
  slides: (
    <>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M12 16v4M8.5 20h7M7.5 12.2l3-3 2.4 2 3.6-3.6" />
    </>
  ),
  picture: (
    <>
      <rect x="3" y="4.5" width="18" height="15" rx="2.4" />
      <circle cx="8.6" cy="9.6" r="1.6" />
      <path d="M3.5 17l5-4.4 4 3.4 3-2.5 5 4" />
    </>
  ),
  home: <path d="M4 10.8 12 4.5l8 6.3V19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19zM10 20.5v-5.2h4v5.2" />,
  note: <path d="M14.5 3.5h-8A1.5 1.5 0 0 0 5 5v14a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19V8zM14.5 3.5V8H19M8.5 12.5h7M8.5 16h4.5" />,
  play: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M10.3 8.9v6.2l5-3.1z" />
    </>
  ),
  glossary: <path d="M6.5 3.5h11.5v17H6.5A1.5 1.5 0 0 1 5 19V5a1.5 1.5 0 0 1 1.5-1.5zM5 17.6A1.5 1.5 0 0 1 6.5 16H18M9 7.5h5.5" />,
  link: <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />,
  other: (
    <>
      <rect x="4" y="4" width="6.6" height="6.6" rx="1.6" />
      <rect x="13.4" y="4" width="6.6" height="6.6" rx="1.6" />
      <rect x="4" y="13.4" width="6.6" height="6.6" rx="1.6" />
      <circle cx="16.7" cy="16.7" r="3.3" />
    </>
  ),
};

const BY_KIND: Record<string, PageIconName> = {
  goal: 'goal',
  placement: 'goal',
  text: 'text',
  exam: 'exam',
  'mock-exam': 'exam',
  'comm-tasks': 'chat',
  slides: 'slides',
  grammar: 'pencil',
  'grammar-board': 'pencil',
  hw: 'home',
  vocab: 'cards',
  quizlet: 'cards',
  notes: 'note',
  pictures: 'picture',
  video: 'play',
};

/** іконка сторінки за типом */
export function iconForKind(kind: string): PageIconName {
  return BY_KIND[kind] ?? 'other';
}

/** іконка розділу без номера: «Słowniczek», «Źródła», цілі уроку; null — беремо іконку першої сторінки */
export function iconForSection(title: string): PageIconName | null {
  if (/s[łl]owniczek|s[łl]owa z tekstu|glossary|словник/i.test(title)) return 'glossary';
  if (/[źz]r[óo]d[łl]a|sources|джерела/i.test(title)) return 'link';
  if (/po tej lekcji|cele lekcji/i.test(title)) return 'goal';
  return null;
}

export function pageIcon(p: Pick<BookPage, 'kind' | 'section'>): PageIconName {
  return iconForSection(p.section) ?? iconForKind(p.kind);
}

export function PageIcon({ name, className }: { name: PageIconName; className?: string }) {
  return (
    <svg
      className={className ? `lp-pi ${className}` : 'lp-pi'}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}

/** галочка, що «малюється» (stroke-dashoffset у lesson.css) */
export function CheckMark({ className }: { className?: string }) {
  return (
    <svg
      className={className ? `lp-check ${className}` : 'lp-check'}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path pathLength={1} d="M5.5 12.6l4.1 4.1L18.6 7.6" />
    </svg>
  );
}
