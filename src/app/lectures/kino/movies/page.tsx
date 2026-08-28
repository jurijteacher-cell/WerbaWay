'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Lightbulb, X, Check } from 'lucide-react';
import {
  movieTitanic,
  movieHarryPotter,
  movieFrozen,
  movieHomeAlone,
  movieAvengers,
  movieIntouchables,
} from '@/content/lessons/movies';

const TOTAL_ROUNDS = 3;
const MOVIES_STORAGE_KEY = 'werba-movies-progress-v1';
const MOVIE_COUNT = 6;

// Перевикористовую контент прямо з movies.ts — жодного дублювання питань.
const POSTER_BY_SLUG: Record<string, string> = {
  'movie-titanic': '/movies/titanic.png',
  'movie-harry-potter': '/movies/harry-potter.png',
  'movie-frozen': '/movies/frozen.png',
  'movie-home-alone': '/movies/home-alone.png',
  'movie-avengers': '/movies/avengers.jpg',
  'movie-intouchables': '/movies/intouchables.png',
};

const movies = [movieTitanic, movieHarryPotter, movieFrozen, movieHomeAlone, movieAvengers, movieIntouchables].map(
  (lesson) => ({
    slug: lesson.slug,
    title: lesson.title,
    poster: POSTER_BY_SLUG[lesson.slug],
    questions: lesson.exercises
      .filter((e) => e.type === 'open_text')
      .map((e) => ({ q: e.prompt, sample: e.sampleAnswer })),
  })
);

function defaultViewCounts() {
  return Array.from({ length: MOVIE_COUNT }, () => 0);
}

function loadViewCounts(): number[] {
  try {
    const raw = localStorage.getItem(MOVIES_STORAGE_KEY);
    if (!raw) return defaultViewCounts();
    const parsed = JSON.parse(raw) as number[];
    if (!Array.isArray(parsed) || parsed.length !== MOVIE_COUNT) return defaultViewCounts();
    return parsed.map((n) => Math.min(TOTAL_ROUNDS, Math.max(0, Number(n) || 0)));
  } catch {
    return defaultViewCounts();
  }
}

export default function MoviesPracticePage() {
  const [viewCounts, setViewCounts] = useState<number[]>(defaultViewCounts);
  const [storageReady, setStorageReady] = useState(false);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [questionIdx, setQuestionIdx] = useState(0);
  const [answer, setAnswer] = useState('');
  const [showSample, setShowSample] = useState(false);

  useEffect(() => {
    setViewCounts(loadViewCounts());
    setStorageReady(true);
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    localStorage.setItem(MOVIES_STORAGE_KEY, JSON.stringify(viewCounts));
  }, [viewCounts, storageReady]);

  const totalDone = viewCounts.reduce((a, b) => a + b, 0);
  const totalTarget = movies.length * TOTAL_ROUNDS;

  const openMovie = (idx: number) => {
    setActiveIdx(idx);
    setQuestionIdx(0);
    setAnswer('');
    setShowSample(false);
  };

  const closeModal = () => setActiveIdx(null);

  const nextQuestion = () => {
    if (activeIdx === null) return;
    const movie = movies[activeIdx];
    if (questionIdx + 1 < movie.questions.length) {
      setQuestionIdx((i) => i + 1);
      setAnswer('');
      setShowSample(false);
    } else {
      setViewCounts((prev) => {
        const next = [...prev];
        next[activeIdx] = Math.min(TOTAL_ROUNDS, next[activeIdx] + 1);
        return next;
      });
      closeModal();
    }
  };

  const active = activeIdx !== null ? movies[activeIdx] : null;
  const question = active ? active.questions[questionIdx] : null;

  return (
    <main className="mx-auto max-w-4xl px-4 py-16">
      <Link href="/lectures/kino" className="text-sm text-paper-muted transition-colors hover:text-gold">
        ← Кіно
      </Link>
      <h1 className="mb-1 mt-4 font-display text-4xl text-paper">Popularne filmy</h1>
      <p className="mb-2 text-paper-muted">
        Клікни картку фільму й відповідай польською на 5 питань про персонажів — письмово тут або усно з
        викладачем. Кожен фільм можна пройти 3 рази.
      </p>
      <p className="mb-8 font-mono text-xs uppercase tracking-widest text-gold-dim">
        Прогрес: {totalDone} / {totalTarget}
      </p>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {movies.map((movie, i) => (
          <button
            key={movie.slug}
            onClick={() => openMovie(i)}
            className="overflow-hidden rounded-xl border border-ink-line bg-ink-raised text-left transition-colors hover:border-gold"
          >
            {movie.poster && (
              <Image
                src={movie.poster}
                alt={movie.title}
                width={600}
                height={900}
                sizes="(max-width: 640px) 50vw, 33vw"
                className="block aspect-[2/3] w-full bg-ink object-cover"
                quality={95}
              />
            )}
            <div className="p-4">
              <p className="font-display text-base leading-snug text-paper sm:text-lg">{movie.title}</p>
              <div className="mt-3 flex gap-1.5">
                {Array.from({ length: TOTAL_ROUNDS }).map((_, dot) => (
                  <span
                    key={dot}
                    className={`h-1.5 w-1.5 rounded-full ${
                      dot < viewCounts[i] ? 'bg-gold' : 'bg-ink-line'
                    }`}
                  />
                ))}
              </div>
            </div>
          </button>
        ))}
      </div>

      {active && question && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-ink-line bg-ink-raised p-6">
            <div className="mb-4 flex items-start gap-4">
              {active.poster && (
                <Image
                  src={active.poster}
                  alt=""
                  width={56}
                  height={84}
                  className="h-20 w-14 shrink-0 rounded-md border border-ink-line object-cover"
                  quality={95}
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-display text-lg text-gold">{active.title}</p>
                  <button onClick={closeModal} className="shrink-0 text-paper-muted hover:text-paper">
                    <X size={18} />
                  </button>
                </div>
                <p className="mt-1 font-mono text-xs text-paper-muted">
                  Питання {questionIdx + 1} / {active.questions.length}
                </p>
              </div>
            </div>

            <p className="mb-3 font-medium text-paper">{question.q}</p>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Напиши відповідь польською (або відповідай усно)…"
              rows={4}
              className="w-full resize-none rounded-lg border border-ink-line bg-ink px-3 py-2 text-sm text-paper outline-none focus:border-gold"
            />

            {question.sample && !showSample && (
              <button
                onClick={() => setShowSample(true)}
                className="mt-2 inline-flex items-center gap-1.5 text-xs text-paper-muted hover:text-gold"
              >
                <Lightbulb size={13} /> Показати приклад відповіді
              </button>
            )}
            {showSample && question.sample && (
              <p className="mt-2 rounded-lg border border-gold/30 bg-gold/5 px-3 py-2 text-sm text-paper-muted">
                <span className="font-medium text-gold">Приклад:</span> {question.sample}
              </p>
            )}

            <div className="mt-5 flex justify-end">
              <button
                onClick={nextQuestion}
                className="flex items-center gap-1.5 rounded-lg bg-gold px-4 py-2 text-sm font-medium text-ink hover:bg-gold-bright"
              >
                {questionIdx + 1 < active.questions.length ? (
                  'Далі →'
                ) : (
                  <>
                    <Check size={15} /> Завершити
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
