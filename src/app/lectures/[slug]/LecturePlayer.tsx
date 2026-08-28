'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import type { PublicLecture } from '@/content/types';
import { ExerciseCard } from '@/components/exercises/ExerciseCard';
import type { SavedSubmission } from '@/lib/submission-types';
import { submissionKey } from '@/lib/submission-types';

type FlatItem = {
  sectionId: string;
  sectionLabel: string;
  lessonSlug: string;
  exercise: PublicLecture['sections'][number]['exercises'][number];
  globalIndex: number;
  indexInSection: number;
};

export function LecturePlayer({
  lecture,
  studentId,
  studentName,
  initialSubmissions = {},
}: {
  lecture: PublicLecture;
  studentId: string;
  studentName: string;
  initialSubmissions?: Record<string, SavedSubmission>;
}) {
  const flat = useMemo<FlatItem[]>(() => {
    let gi = 0;
    return lecture.sections.flatMap((section) =>
      section.exercises.map((exercise, i) => ({
        sectionId: section.id,
        sectionLabel: section.label,
        lessonSlug: section.lessonSlug,
        exercise,
        globalIndex: gi++,
        indexInSection: i,
      }))
    );
  }, [lecture]);

  const [activeIndex, setActiveIndex] = useState(0);
  const [visited, setVisited] = useState<Set<number>>(new Set([0]));
  const channelRef = useRef<RealtimeChannel | null>(null);

  const active = flat[activeIndex];
  const channelName = `lecture-draft-${lecture.slug}`;

  // Окремий канал лише для трансляції позиції (яку вправу учень зараз бачить).
  // ExerciseCard транслює туди ж чернетки відповідей — той самий канал,
  // різні типи подій.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(channelName, { config: { private: true } });
    channel.subscribe();
    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelName]);

  useEffect(() => {
    if (!active) return;
    setVisited((prev) => new Set(prev).add(activeIndex));
    channelRef.current?.send({
      type: 'broadcast',
      event: 'position',
      payload: {
        studentId,
        studentName,
        sectionId: active.sectionId,
        sectionLabel: active.sectionLabel,
        exerciseId: active.exercise.id,
        updatedAt: Date.now(),
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex]);

  if (!active) return null;

  return (
    <div className="flex flex-col gap-4 md:flex-row">
      {/* Сайдбар навігації */}
      <div className="shrink-0 md:w-56">
        <div className="sticky top-6 flex flex-col gap-4">
          {lecture.sections.map((section) => (
            <div key={section.id}>
              <p className="mb-1.5 font-mono text-[11px] uppercase tracking-widest text-gold-dim">{section.label}</p>
              <div className="flex flex-wrap gap-1.5 md:flex-col">
                {section.exercises.map((_, i) => {
                  const item = flat.find((f) => f.sectionId === section.id && f.indexInSection === i)!;
                  const isActive = item.globalIndex === activeIndex;
                  const isVisited = visited.has(item.globalIndex);
                  const saved = initialSubmissions[submissionKey(item.lessonSlug, item.exercise.id)];
                  const isDone = Boolean(saved);
                  return (
                    <button
                      key={item.exercise.id}
                      onClick={() => setActiveIndex(item.globalIndex)}
                      className={`rounded-lg border px-3 py-1.5 text-left text-sm transition-colors md:w-full ${
                        isActive
                          ? 'border-gold bg-gold/10 text-gold-bright'
                          : isDone
                            ? 'border-correct/40 text-correct/90 hover:border-gold/40'
                            : isVisited
                              ? 'border-ink-line text-paper/70 hover:border-gold/40'
                              : 'border-ink-line text-paper-muted hover:border-gold/40'
                      }`}
                    >
                      {isDone ? '✓ ' : ''}Завдання {i + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Активна вправа */}
      <div className="min-w-0 flex-1">
        <p className="mb-1 font-mono text-xs uppercase tracking-widest text-gold-dim">{active.sectionLabel}</p>
        <p className="mb-4 text-sm text-paper-muted">
          Вправа {activeIndex + 1} з {flat.length}
        </p>

        <ExerciseCard
          key={active.exercise.id}
          exercise={active.exercise}
          lessonSlug={active.lessonSlug}
          index={active.indexInSection}
          studentId={studentId}
          studentName={studentName}
          channelName={channelName}
          initialSubmission={initialSubmissions[submissionKey(active.lessonSlug, active.exercise.id)] ?? null}
        />

        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
            disabled={activeIndex === 0}
            className="rounded-lg border border-ink-line px-4 py-2 text-sm text-paper-muted transition-colors hover:border-gold hover:text-gold disabled:cursor-not-allowed disabled:opacity-30"
          >
            ← Попередня
          </button>
          <button
            onClick={() => setActiveIndex((i) => Math.min(flat.length - 1, i + 1))}
            disabled={activeIndex === flat.length - 1}
            className="rounded-lg border border-ink-line px-4 py-2 text-sm text-paper-muted transition-colors hover:border-gold hover:text-gold disabled:cursor-not-allowed disabled:opacity-30"
          >
            Наступна →
          </button>
        </div>
      </div>
    </div>
  );
}
