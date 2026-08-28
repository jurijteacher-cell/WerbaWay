'use client';

import { useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import type { PublicExercise } from '@/content/types';
import { MultipleChoice } from './MultipleChoice';
import { Listening } from './Listening';
import { FillBlank } from './FillBlank';
import { Matching } from './Matching';
import { MatchingClick } from './MatchingClick';
import { OpenText } from './OpenText';
import type { SavedSubmission } from '@/lib/submission-types';
import { hydrateAnswerState, isSubmissionLocked, savedToResult } from '@/lib/hydrate-answer';

type SubmitResult =
  | { ok: true; autoGraded: boolean; isCorrect: boolean | null; feedback?: string | null }
  | { ok: false; error: string };

type Props = {
  exercise: PublicExercise;
  lessonSlug: string;
  index: number;
  /** Потрібні лише для живої трансляції чернетки вчителю — не впливають на саму вправу */
  studentId: string;
  studentName: string;
  /** Канал трансляції. За замовчуванням — канал уроку; лекція передає свій єдиний канал. */
  channelName?: string;
  initialSubmission?: SavedSubmission | null;
};

export function ExerciseCard({
  exercise,
  lessonSlug,
  index,
  studentId,
  studentName,
  channelName,
  initialSubmission,
}: Props) {
  const hydrated = initialSubmission ? hydrateAnswerState(exercise, initialSubmission) : null;
  const [mcValue, setMcValue] = useState<number | null>(hydrated?.mcValue ?? null);
  const [textValue, setTextValue] = useState(hydrated?.textValue ?? '');
  const [matchValue, setMatchValue] = useState<Record<string, string>>(hydrated?.matchValue ?? {});
  const [status, setStatus] = useState<'idle' | 'submitting'>('idle');
  const [result, setResult] = useState<SubmitResult | null>(() =>
    initialSubmission ? savedToResult(initialSubmission) : null
  );

  const channelRef = useRef<RealtimeChannel | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resolvedChannel = channelName ?? `lesson-draft-${lessonSlug}`;

  // Приватний канал: цей учень тільки НАДСИЛАЄ, ніколи не слухає (див. RLS
  // у supabase/migrations/0002_live_monitoring.sql і 0003_lectures.sql) —
  // інші учні його не почують.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(resolvedChannel, { config: { private: true } });
    channel.subscribe();
    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
    };
  }, [resolvedChannel]);

  const broadcastDraft = (submitted: boolean, finalResult?: SubmitResult) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const send = () => {
      channelRef.current?.send({
        type: 'broadcast',
        event: 'draft',
        payload: {
          studentId,
          studentName,
          lessonSlug,
          exerciseId: exercise.id,
          exerciseType: exercise.type,
          answer: buildAnswer(),
          submitted,
          isCorrect: finalResult?.ok ? finalResult.isCorrect : null,
          updatedAt: Date.now(),
        },
      });
    };
    if (submitted) {
      send(); // фінальний стан — без затримки
    } else {
      debounceRef.current = setTimeout(send, 400);
    }
  };

  // Живі чернетки: транслюємо зміну відповіді (з дебаунсом), поки вправу не заблоковано.
  useEffect(() => {
    if (result?.ok) return; // вже відправлено — фінальний стан шлється окремо в submit()
    if (mcValue === null && textValue === '' && Object.keys(matchValue).length === 0) return;
    broadcastDraft(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mcValue, textValue, matchValue]);

  const buildAnswer = (): unknown => {
    switch (exercise.type) {
      case 'multiple_choice':
      case 'listening':
        return { selectedIndex: mcValue };
      case 'fill_blank':
        return { text: textValue };
      case 'matching':
        return { pairs: matchValue };
      case 'open_text':
        return { text: textValue };
    }
  };

  const isAnswered = (): boolean => {
    switch (exercise.type) {
      case 'multiple_choice':
      case 'listening':
        return mcValue !== null;
      case 'fill_blank':
      case 'open_text':
        return textValue.trim().length > 0;
      case 'matching':
        return exercise.words.every((w) => Boolean(matchValue[w.pairId]));
    }
  };

  const submit = async () => {
    setStatus('submitting');
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonSlug,
          exerciseId: exercise.id,
          exerciseType: exercise.type,
          answer: buildAnswer(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ ok: false, error: data.error ?? 'Помилка відправки' });
      } else {
        const finalResult: SubmitResult = {
          ok: true,
          autoGraded: data.autoGraded,
          isCorrect: data.isCorrect,
          feedback: data.feedback ?? null,
        };
        setResult(finalResult);
        broadcastDraft(true, finalResult);
      }
    } catch {
      setResult({ ok: false, error: 'Немає з\'єднання із сервером' });
    } finally {
      setStatus('idle');
    }
  };

  const locked = isSubmissionLocked(initialSubmission ?? null, result?.ok ? result : null);

  const retry = () => {
    setMcValue(null);
    setTextValue('');
    setMatchValue({});
    setResult(null);
  };

  return (
    <div className="rounded-xl border border-ink-line bg-ink-raised/50 p-5">
      <p className="mb-4 text-sm uppercase tracking-wide text-gold-dim">Завдання {index + 1}</p>
      <p className="mb-4 text-paper">{exercise.prompt}</p>

      {exercise.type === 'multiple_choice' && (
        <MultipleChoice options={exercise.options} value={mcValue} onChange={setMcValue} disabled={locked} />
      )}
      {exercise.type === 'listening' && (
        <Listening audioUrl={exercise.audioUrl} options={exercise.options} value={mcValue} onChange={setMcValue} disabled={locked} />
      )}
      {exercise.type === 'fill_blank' && (
        <FillBlank textWithBlank={exercise.textWithBlank} value={textValue} onChange={setTextValue} disabled={locked} />
      )}
      {exercise.type === 'matching' && exercise.variant === 'click' && (
        <MatchingClick
          words={exercise.words}
          definitions={exercise.definitions}
          value={matchValue}
          onChange={(pairId, definitionLabel) => setMatchValue((prev) => ({ ...prev, [pairId]: definitionLabel }))}
          disabled={locked}
        />
      )}
      {exercise.type === 'matching' && exercise.variant !== 'click' && (
        <Matching
          words={exercise.words}
          definitions={exercise.definitions}
          value={matchValue}
          onChange={(pairId, definitionLabel) => setMatchValue((prev) => ({ ...prev, [pairId]: definitionLabel }))}
          disabled={locked}
        />
      )}
      {exercise.type === 'open_text' && (
        <OpenText
          placeholder={exercise.placeholder}
          value={textValue}
          onChange={setTextValue}
          disabled={locked}
          sampleAnswer={exercise.sampleAnswer}
        />
      )}

      <div className="mt-4 flex flex-wrap items-center gap-4">
        {!locked && (
          <button
            type="button"
            onClick={submit}
            disabled={!isAnswered() || status === 'submitting'}
            className="rounded-lg bg-gold px-5 py-2 font-medium text-ink transition-colors hover:bg-gold-bright disabled:cursor-not-allowed disabled:opacity-40"
          >
            {status === 'submitting' ? 'Надсилаю…' : initialSubmission ? 'Оновити відповідь' : 'Відповісти'}
          </button>
        )}

        {locked && (
          <button
            type="button"
            onClick={retry}
            className="rounded-lg border border-ink-line px-4 py-2 text-sm text-paper-muted transition-colors hover:border-gold hover:text-gold"
          >
            Спробувати знову
          </button>
        )}

        {result?.ok === false && <p className="text-sm text-incorrect">{result.error}</p>}

        {result?.ok === true && result.autoGraded && (
          <div className="flex flex-col gap-1">
            <p className={`text-sm font-medium ${result.isCorrect ? 'text-correct' : 'text-incorrect'}`}>
              {result.isCorrect ? '✓ Правильно' : '✕ Неправильно'}
            </p>
            {result.feedback && <p className="text-sm text-paper-muted">{result.feedback}</p>}
          </div>
        )}
        {result?.ok === true && !result.autoGraded && result.isCorrect === null && (
          <p className="text-sm text-gold-dim">Прийнято, очікує перевірки викладачем</p>
        )}
        {result?.ok === true && !result.autoGraded && result.isCorrect !== null && (
          <div className="flex flex-col gap-1">
            <p className={`text-sm font-medium ${result.isCorrect ? 'text-correct' : 'text-incorrect'}`}>
              {result.isCorrect ? '✓ Зараховано викладачем' : '✕ Не зараховано викладачем'}
            </p>
            {result.feedback && (
              <p className="text-sm text-paper-muted">
                <span className="font-medium text-gold">Коментар:</span> {result.feedback}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
