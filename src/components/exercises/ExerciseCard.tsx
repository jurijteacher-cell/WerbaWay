'use client';

import { useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import type { PublicExercise } from '@/content/types';
import { MultipleChoice } from './MultipleChoice';
import { Listening } from './Listening';
import { FillBlank } from './FillBlank';
import { Matching } from './Matching';
import { OpenText } from './OpenText';

type SubmitResult = { ok: true; autoGraded: boolean; isCorrect: boolean | null } | { ok: false; error: string };

type Props = {
  exercise: PublicExercise;
  lessonSlug: string;
  index: number;
  /** Потрібні лише для живої трансляції чернетки вчителю — не впливають на саму вправу */
  studentId: string;
  studentName: string;
};

export function ExerciseCard({ exercise, lessonSlug, index, studentId, studentName }: Props) {
  const [mcValue, setMcValue] = useState<number | null>(null);
  const [textValue, setTextValue] = useState('');
  const [matchValue, setMatchValue] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<'idle' | 'submitting'>('idle');
  const [result, setResult] = useState<SubmitResult | null>(null);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Приватний канал: цей учень тільки НАДСИЛАЄ, ніколи не слухає (див. RLS
  // у supabase/migrations/0002_live_monitoring.sql) — інші учні його не почують.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`lesson-draft-${lessonSlug}`, { config: { private: true } });
    channel.subscribe();
    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
    };
  }, [lessonSlug]);

  const broadcastDraft = (submitted: boolean, finalResult?: SubmitResult) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const send = () => {
      channelRef.current?.send({
        type: 'broadcast',
        event: 'draft',
        payload: {
          studentId,
          studentName,
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
        return exercise.leftItems.every((item) => Boolean(matchValue[item.id]));
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
        const finalResult: SubmitResult = { ok: true, autoGraded: data.autoGraded, isCorrect: data.isCorrect };
        setResult(finalResult);
        broadcastDraft(true, finalResult);
      }
    } catch {
      setResult({ ok: false, error: 'Немає з\'єднання із сервером' });
    } finally {
      setStatus('idle');
    }
  };

  const locked = result?.ok === true;

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
      {exercise.type === 'matching' && (
        <Matching
          leftItems={exercise.leftItems}
          rightItems={exercise.rightItems}
          value={matchValue}
          onChange={(leftId, rightValue) => setMatchValue((prev) => ({ ...prev, [leftId]: rightValue }))}
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

      <div className="mt-4 flex items-center gap-4">
        {!locked && (
          <button
            type="button"
            onClick={submit}
            disabled={!isAnswered() || status === 'submitting'}
            className="rounded-lg bg-gold px-5 py-2 font-medium text-ink transition-colors hover:bg-gold-bright disabled:cursor-not-allowed disabled:opacity-40"
          >
            {status === 'submitting' ? 'Надсилаю…' : 'Відповісти'}
          </button>
        )}

        {result?.ok === false && <p className="text-sm text-incorrect">{result.error}</p>}

        {result?.ok === true && result.autoGraded && (
          <p className={`text-sm font-medium ${result.isCorrect ? 'text-correct' : 'text-incorrect'}`}>
            {result.isCorrect ? '✓ Правильно' : '✕ Неправильно'}
          </p>
        )}
        {result?.ok === true && !result.autoGraded && (
          <p className="text-sm text-gold-dim">Прийнято, очікує перевірки викладачем</p>
        )}
      </div>
    </div>
  );
}
