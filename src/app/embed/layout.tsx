import type { ReactNode } from 'react';
import { Fredoka, Nunito, Caveat } from 'next/font/google';
import { NotebookShell } from '@/components/exercises/NotebookShell';
import '@/components/exercises/notebook.css';

const fredoka = Fredoka({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600'],
  variable: '--font-fredoka',
  display: 'swap',
});

const nunito = Nunito({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '600', '700'],
  variable: '--font-nunito',
  display: 'swap',
});

const caveat = Caveat({
  subsets: ['latin', 'latin-ext'],
  weight: ['500', '700'],
  variable: '--font-caveat',
  display: 'swap',
});

/** Notebook chrome for Notion iframes — hide root TopNav. */
export default function EmbedLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${fredoka.variable} ${nunito.variable} ${caveat.variable} embed-shell min-h-screen`}
      style={{
        background: '#E7E2D7',
        backgroundImage:
          'radial-gradient(circle at 1px 1px, rgba(27,42,74,.05) 1px, transparent 0)',
        backgroundSize: '22px 22px',
      }}
    >
      <style>{`
        body > header { display: none !important; }
        body { background: #E7E2D7 !important; }
      `}</style>
      <NotebookShell levelHint="lekcja · ćwiczenia">{children}</NotebookShell>
    </div>
  );
}
