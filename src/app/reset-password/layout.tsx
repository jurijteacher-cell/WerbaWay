import type { Metadata } from 'next';

/** Службова сторінка входу — у пошуку їй не місце (видачу веде головна). */
export const metadata: Metadata = { robots: { index: false, follow: true } };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
