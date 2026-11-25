'use client';

import { useRef } from 'react';
import { useAutoFrame } from './useAutoFrame';

/** iframe внутрішньої вправи, що росте на весь вміст (без скролу всередині) — для сторінок викладача. */
export function AutoFrame({ src, title, minHeight = 520, className }: { src: string; title: string; minHeight?: number; className?: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const { height, sendViewport } = useAutoFrame(ref, true);
  return (
    <iframe
      ref={ref}
      src={src}
      title={title}
      scrolling="no"
      className={className}
      style={{ height: height ?? minHeight, display: 'block' }}
      onLoad={sendViewport}
    />
  );
}
