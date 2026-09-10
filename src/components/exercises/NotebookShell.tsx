import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
  brandLabel?: string;
  levelHint?: string;
};

/** Spiral notebook chrome for LMS embeds (STYLE_NOTEBOOK.md). */
export function NotebookShell({
  children,
  brandLabel = 'Werba Way',
  levelHint,
}: Props) {
  return (
    <div className="nb-wrap">
      <div className="nb-brandbar">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/werba-logo.jpg" alt="" width={44} height={44} />
        <div>
          <b>{brandLabel}</b>
          {levelHint ? <span>{levelHint}</span> : null}
        </div>
      </div>

      <div className="nb-book">
        <div className="nb-rings" aria-hidden>
          {Array.from({ length: 13 }).map((_, i) => (
            <span key={i} className="nb-ring" />
          ))}
        </div>
        <div className="nb-sheet">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="nb-logo-stamp" src="/brand/werba-logo.jpg" alt="" />
          {children}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="nb-mark" src="/brand/werba-logo.jpg" alt="" />
        </div>
      </div>
    </div>
  );
}
