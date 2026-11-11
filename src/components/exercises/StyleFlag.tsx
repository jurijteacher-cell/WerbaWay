'use client';

import { useEffect } from 'react';

/** Opt-in visual variant: /embed/...?style=paper switches the notebook to «paper & ink». Default stays unchanged. */
export function StyleFlag() {
  useEffect(() => {
    try {
      const style = new URLSearchParams(window.location.search).get('style');
      const wrap = document.querySelector('.nb-wrap');
      if (wrap && style === 'paper') wrap.setAttribute('data-nb-style', 'paper');
    } catch {
      /* preview only */
    }
  }, []);
  return null;
}
