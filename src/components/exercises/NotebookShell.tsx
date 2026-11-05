import type { ReactNode } from 'react';
import { Onest, Literata } from 'next/font/google';

/**
 * Fonts for every notebook surface (embeds, slides, lesson pages).
 * Both families ship latin-ext (ą ć ę ł ń ó ś ź ż) AND cyrillic (instructions_uk, glosses).
 * Onest = interface, Literata = Polish text, inputs and italic notes. STYLE_NOTEBOOK.md
 */
const onest = Onest({
  subsets: ['latin', 'latin-ext', 'cyrillic', 'cyrillic-ext'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-onest',
  display: 'swap',
});

const literata = Literata({
  subsets: ['latin', 'latin-ext', 'cyrillic', 'cyrillic-ext'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-literata',
  display: 'swap',
});

type Props = {
  children: ReactNode;
  brandLabel?: string;
  levelHint?: string;
  /** Right side of the brand bar (e.g. student code) */
  aside?: ReactNode;
};

/** Notebook chrome for LMS embeds (STYLE_NOTEBOOK.md · UI v2). */
export function NotebookShell({
  children,
  brandLabel = 'Werba Way',
  levelHint,
  aside,
}: Props) {
  return (
    <div className={`nb-wrap ${onest.variable} ${literata.variable}`}>
      <div className="nb-brandbar">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/werba-logo.jpg" alt="" width={38} height={38} />
        <div>
          <b>{brandLabel}</b>
          {levelHint ? <span>{levelHint}</span> : null}
        </div>
        {aside}
      </div>

      <div className="nb-book">
        <div className="nb-sheet">{children}</div>
      </div>
    </div>
  );
}
