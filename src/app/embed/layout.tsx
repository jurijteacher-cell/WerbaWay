import type { ReactNode } from 'react';

/** Minimal chrome for Notion iframes — hide root TopNav via CSS. */
export default function EmbedLayout({ children }: { children: ReactNode }) {
  return (
    <div className="embed-shell min-h-screen bg-ink px-4 py-6 text-paper">
      <style>{`
        body > header { display: none !important; }
        .embed-shell { max-width: 720px; margin: 0 auto; }
      `}</style>
      {children}
    </div>
  );
}
