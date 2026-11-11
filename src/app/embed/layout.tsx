import type { ReactNode } from 'react';
import { NotebookShell } from '@/components/exercises/NotebookShell';
import { AccountBar } from '@/components/exercises/AccountBar';
import { FocusKeeper } from '@/components/exercises/FocusKeeper';
import { StyleFlag } from '@/components/exercises/StyleFlag';
import '@/components/exercises/notebook.css';
import '@/components/exercises/notebook-paper.css';

/* Raw CSS string via dangerouslySetInnerHTML: a JSX text child gets `>` escaped to `&gt;`
   on the server, which broke hydration on every embed (whole page re-rendered on load). */
const EMBED_CSS = `
  body > header { display: none !important; }
  body { background: #efeae0 !important; }
`;

/** Notebook chrome for Notion iframes — hide root TopNav. */
export default function EmbedLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="embed-shell min-h-screen"
      style={{
        background: '#efeae0',
        backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(27,42,74,.045) 1px, transparent 0)',
        backgroundSize: '22px 22px',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: EMBED_CSS }} />
      <NotebookShell levelHint="lekcja · ćwiczenia" aside={<AccountBar />}>
        {children}
        <FocusKeeper />
        <StyleFlag />
      </NotebookShell>
    </div>
  );
}
