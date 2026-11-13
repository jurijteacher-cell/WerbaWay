'use client';


import { useT } from '@/i18n/client';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Word, WordStat } from '@/lib/words';

type Mode = 'cards' | 'match' | 'quiz';
type Dir = 'pl' | 'uk'; // що показуємо спершу

const shuffle = <T,>(a: T[]): T[] => {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
};

export function WordGame({
  words,
  deckNames,
  initialStats,
  initialMode,
}: {
  words: Word[];
  deckNames: string[];
  initialStats: Record<string, WordStat>;
  initialMode: Mode;
}) {
  const t = useT();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [dir, setDir] = useState<Dir>('pl');
  const [onlyUnknown, setOnlyUnknown] = useState(false);
  const [stats, setStats] = useState<Record<string, WordStat>>(initialStats);
  const [round, setRound] = useState(0); // збільшується, щоб перетасувати й почати спочатку
  const statsRef = useRef(stats);
  statsRef.current = stats;
  const dirty = useRef(new Set<string>());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saveErr, setSaveErr] = useState(false);

  const stat = (k: string): WordStat => statsRef.current[k] ?? { known: false, seen: 0, correct: 0 };

  const flush = useCallback(async () => {
    timer.current = null;
    const keys = [...dirty.current];
    dirty.current.clear();
    if (!keys.length) return;
    const items = keys.map((k) => {
      const [slug, ...rest] = k.split(':');
      const s = statsRef.current[k];
      return { slug, id: rest.join(':'), known: s.known, seen: s.seen, correct: s.correct };
    });
    try {
      const res = await fetch('/api/words/mark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
        keepalive: true,
      });
      setSaveErr(!res.ok);
      if (!res.ok) keys.forEach((k) => dirty.current.add(k));
    } catch {
      setSaveErr(true);
      keys.forEach((k) => dirty.current.add(k));
    }
  }, []);

  const update = useCallback(
    (key: string, patch: (s: WordStat) => WordStat) => {
      setStats((prev) => {
        const next = { ...prev, [key]: patch(prev[key] ?? { known: false, seen: 0, correct: 0 }) };
        statsRef.current = next;
        return next;
      });
      dirty.current.add(key);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, 700);
    },
    [flush]
  );

  useEffect(() => {
    const onHide = () => void flush();
    window.addEventListener('pagehide', onHide);
    return () => {
      window.removeEventListener('pagehide', onHide);
      void flush();
    };
  }, [flush]);

  const knownCount = words.filter((w) => stats[w.key]?.known).length;

  // Тасуємо лише в браузері: на сервері порядок інший, і React сварився на розбіжність
  // (сторінка перемальовувалась із нуля). До монтування показуємо коротку заглушку.
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  // пул цієї сесії: фіксується при старті/перетасуванні, а не «пливе» разом із відмітками
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const pool = useMemo(() => shuffle(onlyUnknown ? words.filter((w) => !statsRef.current[w.key]?.known) : words), [words, onlyUnknown, round, mode]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/words" className="text-sm text-paper-muted hover:text-gold">
        ← До колод
      </Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-2xl text-paper">{deckNames.length === 1 ? deckNames[0] : `${deckNames.length} колоди разом`}</h1>
          <p className="text-sm text-paper-muted">
            {words.length} слів · запам’ятано <b className="text-paper">{knownCount}</b>
          </p>
        </div>
        <div className="ww-nav">
          {(['cards', 'match', 'quiz'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className="ww-nav-link"
              aria-current={mode === m ? 'page' : undefined}
            >
              {m === 'cards' ? t("Картки") : m === 'match' ? t("Пари") : t("Тест")}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-5 mt-4 flex flex-wrap items-center gap-4 text-sm text-paper-muted">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={onlyUnknown} onChange={(e) => setOnlyUnknown(e.target.checked)} />
          тільки невивчені
        </label>
        <button type="button" className="text-gold hover:text-gold-bright" onClick={() => setDir(dir === 'pl' ? 'uk' : 'pl')}>
          Спершу: {dir === 'pl' ? t("польське слово") : t("переклад")} ⇄
        </button>
        <button type="button" className="text-gold hover:text-gold-bright" onClick={() => setRound((r) => r + 1)}>
          🔀 Перемішати
        </button>
        {saveErr && <span className="text-incorrect">{t("не вдалося зберегти, спробую ще")}</span>}
      </div>

      {!ready ? (
        <p className="rounded-2xl border border-ink-line bg-ink-raised p-8 text-center text-paper-muted">{t("Готуємо картки…")}</p>
      ) : pool.length === 0 ? (
        <Done title={t("Усі слова вже запам’ятані 🎉")} onAgain={() => setOnlyUnknown(false)} again={t("Тренувати всі слова")} />
      ) : mode === 'cards' ? (
        <Cards key={`c${round}${onlyUnknown}`} pool={pool} dir={dir} update={update} stat={stat} onAgain={() => setRound((r) => r + 1)} />
      ) : mode === 'match' ? (
        <Match key={`m${round}${onlyUnknown}`} pool={pool} dir={dir} update={update} stat={stat} onAgain={() => setRound((r) => r + 1)} />
      ) : (
        <Quiz key={`q${round}${onlyUnknown}`} pool={pool} all={words} dir={dir} update={update} stat={stat} onAgain={() => setRound((r) => r + 1)} />
      )}
    </main>
  );
}

type Common = {
  pool: Word[];
  dir: Dir;
  update: (key: string, p: (s: WordStat) => WordStat) => void;
  stat: (k: string) => WordStat;
  onAgain: () => void;
};

function Done({ title, sub, onAgain, again }: { title: string; sub?: string; onAgain: () => void; again?: string }) {
  const t = useT();
  return (
    <div className="rounded-2xl border border-ink-line bg-ink-raised p-8 text-center">
      <p className="font-display text-2xl text-paper">{title}</p>
      {sub && <p className="mt-2 text-paper-muted">{sub}</p>}
      <button type="button" onClick={onAgain} className="ww-btn ww-btn-primary mt-5">
        {again ?? t("Ще раз")}
      </button>
    </div>
  );
}

/* ───────────── Картки ───────────── */
function Cards({ pool, dir, update, onAgain }: Common) {
  const t = useT();
  const [queue, setQueue] = useState<Word[]>(pool);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(0);
  // свайп на телефоні: вправо — «знаю», вліво — «ще вчу»
  const [dx, setDx] = useState(0);
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const w = queue[0];

  const answer = useCallback(
    (known: boolean) => {
      if (!w) return;
      update(w.key, (s) => ({ ...s, known, seen: s.seen + 1 }));
      setFlipped(false);
      if (known) {
        setQueue((q) => q.slice(1));
        setDone((d) => d + 1);
      } else {
        setQueue((q) => [...q.slice(1), q[0]]); // «ще вчу» — повертається в кінець
      }
    },
    [w, update]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (e.key === 'ArrowRight') answer(true);
      else if (e.key === 'ArrowLeft') answer(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [answer]);

  if (!w) return <Done title={t("Колоду пройдено")} sub={`${done} слів позначено «знаю»`} onAgain={onAgain} again={t("Перемішати й ще раз")} />;

  const front = dir === 'pl' ? w.term : w.tr;
  const back = dir === 'pl' ? w.tr : w.term;
  return (
    <div>
      <div className="mb-2 flex justify-between text-xs text-paper-muted">
        <span>{w.group}</span>
        <span>
          лишилось {queue.length} · знаю {done}
        </span>
      </div>
      <button
        type="button"
        onClick={() => {
          if (drag.current?.moved) return;
          setFlipped((f) => !f);
        }}
        onPointerDown={(e) => {
          if (e.pointerType === 'mouse') return;
          drag.current = { x: e.clientX, y: e.clientY, moved: false };
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          const ddx = e.clientX - d.x;
          if (!d.moved && Math.abs(ddx) > 10 && Math.abs(ddx) > Math.abs(e.clientY - d.y)) d.moved = true;
          if (d.moved) setDx(ddx);
        }}
        onPointerUp={() => {
          const d = drag.current;
          if (d?.moved && Math.abs(dx) > 90) answer(dx > 0);
          setDx(0);
          setTimeout(() => (drag.current = null), 0);
        }}
        onPointerCancel={() => {
          drag.current = null;
          setDx(0);
        }}
        style={{
          transform: dx ? `translateX(${dx}px) rotate(${dx / 18}deg)` : undefined,
          transition: dx ? 'none' : 'transform .25s ease',
          touchAction: 'pan-y',
          borderColor: dx > 60 ? '#0f7a55' : dx < -60 ? '#cf3a57' : undefined,
        }}
        className="flex min-h-[18rem] w-full select-none flex-col items-center justify-center gap-3 rounded-3xl border-2 border-ink-line bg-ink-raised p-8 text-center shadow-[0_6px_0_#dde3f3] transition-colors hover:border-gold/60"
        aria-label={t("Перевернути картку")}
      >
        {!flipped ? (
          <>
            <span className="font-serif text-4xl text-paper">{front}</span>
            {dir === 'pl' && w.pos && <span className="text-sm text-paper-muted">{w.pos}</span>}
            <span className="mt-4 hidden text-xs text-gold-dim md:inline">{t("натисни, щоб перевернути · пробіл")}</span>
            <span className="mt-4 text-xs text-gold-dim md:hidden">{t("торкнись, щоб перевернути · свайп вправо — знаю, вліво — ще вчу")}</span>
          </>
        ) : (
          <>
            <span className="font-serif text-3xl text-paper">{back}</span>
            {w.def && <span className="max-w-md text-sm text-paper-muted">{w.def}</span>}
            {w.ex && <span className="max-w-md font-serif italic text-paper">„{w.ex}”</span>}
          </>
        )}
      </button>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => answer(false)}
          className="ww-btn ww-btn-danger ww-btn-lg"
        >
          ← Ще вчу
        </button>
        <button
          type="button"
          onClick={() => answer(true)}
          className="ww-btn ww-btn-success ww-btn-lg"
        >
          Знаю ✓ →
        </button>
      </div>
    </div>
  );
}

/* ───────────── Пари ───────────── */
const PAIRS = 6;
function Match({ pool, dir, update, onAgain }: Common) {
  const t = useT();
  const [idx, setIdx] = useState(0); // початок поточного раунду
  const [mistakes, setMistakes] = useState(0);
  const [matched, setMatched] = useState<string[]>([]);
  const [left, setLeft] = useState<string | null>(null);
  const [bad, setBad] = useState<string[]>([]);
  const [t0] = useState(() => Date.now());
  const round = useMemo(() => pool.slice(idx, idx + PAIRS), [pool, idx]);
  const cols = useMemo(() => ({ a: shuffle(round), b: shuffle(round) }), [round]);

  useEffect(() => {
    if (round.length && matched.length === round.length) {
      const id = setTimeout(() => {
        setIdx((i) => i + PAIRS);
        setMatched([]);
        setLeft(null);
      }, 600);
      return () => clearTimeout(id);
    }
  }, [matched, round]);

  if (!round.length)
    return (
      <Done
        title={t("Усі пари з’єднано")}
        sub={`${pool.length} слів · помилок: ${mistakes} · ${Math.round((Date.now() - t0) / 1000)} с`}
        onAgain={onAgain}
        again={t("Перемішати й ще раз")}
      />
    );

  const pick = (side: 'a' | 'b', w: Word) => {
    if (matched.includes(w.key)) return;
    if (side === 'a') return setLeft(w.key === left ? null : w.key);
    if (!left) return;
    if (left === w.key) {
      update(w.key, (s) => ({ ...s, seen: s.seen + 1, correct: s.correct + 1 }));
      setMatched((m) => [...m, w.key]);
    } else {
      update(left, (s) => ({ ...s, seen: s.seen + 1 }));
      setMistakes((m) => m + 1);
      setBad([left, w.key]);
      setTimeout(() => setBad([]), 450);
    }
    setLeft(null);
  };

  const label = (w: Word, side: 'a' | 'b') => ((side === 'a') === (dir === 'pl') ? w.term : w.tr);
  const cell = (w: Word, side: 'a' | 'b') => {
    const ok = matched.includes(w.key);
    const sel = side === 'a' && left === w.key;
    const err = bad.includes(w.key);
    return (
      <button
        key={side + w.key}
        type="button"
        disabled={ok}
        onClick={() => pick(side, w)}
        className={`min-h-[3.4rem] rounded-xl border-2 px-3 py-2 text-center font-serif text-lg transition-colors ${
          ok
            ? 'border-correct/40 bg-correct/10 text-correct opacity-70'
            : err
              ? 'border-incorrect bg-incorrect/10 text-incorrect'
              : sel
                ? 'border-gold bg-gold-fill/60 text-paper'
                : 'border-ink-line bg-ink-raised text-paper hover:border-gold/60'
        }`}
      >
        {label(w, side)}
      </button>
    );
  };

  return (
    <div>
      <p className="mb-3 text-sm text-paper-muted">
        Раунд {Math.floor(idx / PAIRS) + 1} з {Math.ceil(pool.length / PAIRS)} · помилок: {mistakes}
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">{cols.a.map((w) => cell(w, 'a'))}</div>
        <div className="flex flex-col gap-2">{cols.b.map((w) => cell(w, 'b'))}</div>
      </div>
    </div>
  );
}

/* ───────────── Тест ───────────── */
function Quiz({ pool, all, dir, update, onAgain }: Common & { all: Word[] }) {
  const t = useT();
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const w = pool[i];

  const options = useMemo(() => {
    if (!w) return [];
    const same = (x: Word) => (dir === 'pl' ? x.tr : x.term);
    const others = shuffle(all.filter((x) => x.key !== w.key && same(x) !== same(w)));
    return shuffle([w, ...others.slice(0, 3)]);
  }, [w, all, dir]);

  if (!w)
    return (
      <Done title={`Результат: ${score} з ${pool.length}`} sub={`${Math.round((score / pool.length) * 100)}% правильно з першого разу`} onAgain={onAgain} again={t("Перемішати й ще раз")} />
    );

  const ask = dir === 'pl' ? w.term : w.tr;
  const ans = (x: Word) => (dir === 'pl' ? x.tr : x.term);
  const choose = (x: Word) => {
    if (picked) return;
    setPicked(x.key);
    const ok = x.key === w.key;
    update(w.key, (s) => ({ ...s, seen: s.seen + 1, correct: s.correct + (ok ? 1 : 0) }));
    if (ok) {
      setScore((s) => s + 1);
      setTimeout(() => {
        setPicked(null);
        setI((n) => n + 1);
      }, 700);
    }
  };

  return (
    <div>
      <p className="mb-3 text-sm text-paper-muted">
        Питання {i + 1} з {pool.length} · правильно: {score}
      </p>
      <div className="mb-4 rounded-3xl border-2 border-ink-line bg-ink-raised p-8 text-center shadow-[0_6px_0_#dde3f3]">
        <span className="font-serif text-4xl text-paper">{ask}</span>
        {dir === 'pl' && w.pos && <p className="mt-2 text-sm text-paper-muted">{w.pos}</p>}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((x) => {
          const isRight = x.key === w.key;
          const state = !picked ? '' : isRight ? 'ok' : picked === x.key ? 'bad' : 'dim';
          return (
            <button
              key={x.key}
              type="button"
              onClick={() => choose(x)}
              className={`min-h-[3.4rem] rounded-xl border-2 px-3 py-2 text-center font-serif text-lg transition-colors ${
                state === 'ok'
                  ? 'border-correct bg-correct/10 text-correct'
                  : state === 'bad'
                    ? 'border-incorrect bg-incorrect/10 text-incorrect'
                    : state === 'dim'
                      ? 'border-ink-line bg-ink-raised text-paper-muted opacity-60'
                      : 'border-ink-line bg-ink-raised text-paper hover:border-gold/60'
              }`}
            >
              {ans(x)}
            </button>
          );
        })}
      </div>
      {picked && picked !== w.key && (
        <button
          type="button"
          onClick={() => {
            setPicked(null);
            setI((n) => n + 1);
          }}
          className="ww-btn ww-btn-primary ww-btn-lg mt-4 w-full"
        >
          Далі →
        </button>
      )}
    </div>
  );
}
