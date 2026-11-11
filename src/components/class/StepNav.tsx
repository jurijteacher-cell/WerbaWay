'use client';

import { useEffect, useState } from 'react';
import type { StepDTO } from '@/lib/class/protocol';

export type StepsData = { title: string; hasHomework: boolean; steps: StepDTO[] };

/** Кроки лекції курсу за slug (із /api/learn/steps) */
export function useSteps(slug: string | null): StepsData | null {
  const [data, setData] = useState<StepsData | null>(null);
  useEffect(() => {
    setData(null);
    if (!slug) return;
    let dead = false;
    fetch(`/api/learn/steps?slug=${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => !dead && d && setData(d as StepsData))
      .catch(() => undefined);
    return () => {
      dead = true;
    };
  }, [slug]);
  return data;
}

const ICON: Record<string, string> = {
  goal: '🎯',
  text: '📖',
  exam: '📝',
  'comm-tasks': '💬',
  slides: '🖼️',
  grammar: '✏️',
  hw: '🏠',
  vocab: '🔤',
  quizlet: '🔤',
  video: '▶️',
};

/** Бокова навігація по кроках: викладач клікає — учень слідом; учневі лише підсвічується поточний. */
export function StepNav({
  steps,
  currentUrl,
  onPick,
  disabled,
}: {
  steps: StepDTO[];
  currentUrl: string | null;
  onPick?: (s: StepDTO) => void;
  disabled?: boolean;
}) {
  const groups: { section: string; items: StepDTO[] }[] = [];
  for (const s of steps) {
    const g = groups[groups.length - 1];
    if (g && g.section === s.section) g.items.push(s);
    else groups.push({ section: s.section, items: [s] });
  }
  const idx = steps.findIndex((s) => s.url === currentUrl);
  return (
    <nav aria-label="Кроки заняття" className="flex flex-col gap-3 text-sm">
      {groups.map((g) => (
        <div key={g.section}>
          <p className="mb-1 font-mono text-[11px] uppercase tracking-widest text-gold-dim">{g.section}</p>
          <ul className="flex flex-col gap-1">
            {g.items.map((s) => {
              const here = s.url === currentUrl;
              const cls = `flex w-full items-start gap-2 rounded-lg border px-2.5 py-1.5 text-left transition-colors ${
                here ? 'border-gold bg-gold-fill/60 font-semibold text-paper' : 'border-ink-line bg-ink-raised text-paper-muted'
              } ${onPick && !disabled && !here ? 'hover:border-gold/60 hover:text-paper' : ''}`;
              const body = (
                <>
                  <span aria-hidden>{ICON[s.kind] ?? '•'}</span>
                  <span className="min-w-0">{s.label}</span>
                </>
              );
              return (
                <li key={s.key}>
                  {onPick ? (
                    <button type="button" disabled={disabled} onClick={() => onPick(s)} className={cls} aria-current={here}>
                      {body}
                    </button>
                  ) : (
                    <div className={cls} aria-current={here}>
                      {body}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      {idx >= 0 && (
        <p className="text-xs text-paper-muted">
          Крок {idx + 1} з {steps.length}
        </p>
      )}
    </nav>
  );
}
