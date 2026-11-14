'use client';


import { useT } from '@/i18n/client';
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
  'grammar-board': '✏️',
  notes: '🗒️',
  pictures: '🖼️',
  'mock-exam': '📝',
  placement: '🎯',
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
  const t = useT();
  const groups: { section: string; items: StepDTO[] }[] = [];
  for (const s of steps) {
    const g = groups[groups.length - 1];
    if (g && g.section === s.section) g.items.push(s);
    else groups.push({ section: s.section, items: [s] });
  }
  const idx = steps.findIndex((s) => s.url === currentUrl);
  return (
    <nav aria-label={t("Кроки заняття")} className="ww-steps">
      {groups.map((g) => (
        <div key={g.section} className="ww-steps-group">
          <p className="ww-steps-head">{g.section}</p>
          {g.items.map((s) => {
            const here = s.url === currentUrl;
            const done = idx >= 0 && steps.indexOf(s) < idx;
            const body = (
              <>
                <span className="ww-step-ic" aria-hidden>
                  {done && !here ? '✓' : (ICON[s.kind] ?? '•')}
                </span>
                <span className="ww-step-label">{s.label}</span>
              </>
            );
            return onPick ? (
              <button
                key={s.key}
                type="button"
                disabled={disabled}
                onClick={() => onPick(s)}
                className="ww-step"
                aria-current={here}
                data-done={done ? '1' : undefined}
              >
                {body}
              </button>
            ) : (
              <div key={s.key} className="ww-step" aria-current={here} data-done={done ? '1' : undefined}>
                {body}
              </div>
            );
          })}
        </div>
      ))}
      {idx >= 0 && (
        <p className="px-1 ww-label">
          Крок {idx + 1} з {steps.length}
        </p>
      )}
    </nav>
  );
}
