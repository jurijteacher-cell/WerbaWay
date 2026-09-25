'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

type PublicItem = {
  id: string;
  topic?: string;
  text: string;
  options?: string[];
  open?: boolean;
};

type PublicBlock = {
  block_id: string;
  level: string;
  part: string;
  title: string;
  instruction?: string;
  passage_title?: string;
  passage?: string;
  items?: PublicItem[];
  variants?: Record<
    string,
    { prompt_pl: string; prompt_uk: string; min_words: number; max_words: number }
  >;
};

type PublicTest = {
  lesson_id: string;
  title: string;
  instruction?: string;
  scoring: {
    levels_order: string[];
    dont_know_option: string;
    writing_variant_by_level: Record<string, 'A' | 'B'>;
  };
  results: {
    plus_note_pl?: string;
    plus_note_uk?: string;
    footer_pl?: string;
    footer_uk?: string;
  };
  blocks: PublicBlock[];
};

type Tab = 'Start' | 'A1' | 'A2' | 'B1' | 'B2' | 'Pisanie' | 'Wynik';

const DIACRITICS = ['ą', 'ć', 'ę', 'ł', 'ń', 'ó', 'ś', 'ź', 'ż'];

function shuffle<T>(arr: T[], seed: string): T[] {
  const out = [...arr];
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  for (let i = out.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    const j = Math.abs(h) % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function wordCount(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function insertAtCursor(
  value: string,
  insert: string,
  start: number,
  end: number
): { value: string; caret: number } {
  const next = value.slice(0, start) + insert + value.slice(end);
  return { value: next, caret: start + insert.length };
}

type Props = { lessonId: string; introMd?: { title: string; bodyHtml?: string } };

export function PlacementTest({ lessonId }: Props) {
  const [test, setTest] = useState<PublicTest | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [imie, setImie] = useState('');
  const [tab, setTab] = useState<Tab>('Start');
  const [unlocked, setUnlocked] = useState<Set<Tab>>(new Set(['Start']));
  const [doneLevels, setDoneLevels] = useState<Set<string>>(new Set());
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [levelTokens, setLevelTokens] = useState<string[]>([]);
  const [writing, setWriting] = useState('');
  const [busy, setBusy] = useState(false);
  const [startedAt] = useState(() => Date.now());
  const [result, setResult] = useState<{
    level: string;
    display: string;
    text_pl: string;
    text_uk: string;
    plus_note_pl?: string;
    plus_note_uk?: string;
    footer_pl?: string;
    footer_uk?: string;
  } | null>(null);
  const [writingVariant, setWritingVariant] = useState<'A' | 'B'>('A');
  const [seed] = useState(() => `${Date.now()}-${Math.random()}`);
  const [showPassage, setShowPassage] = useState(false);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('imie');
    if (q) setImie(q);
  }, []);

  useEffect(() => {
    fetch(`/api/placement/${lessonId}`)
      .then(async (r) => {
        if (!r.ok) throw new Error('load failed');
        return r.json();
      })
      .then((data: PublicTest) => setTest(data))
      .catch(() => setLoadError('Nie udało się wczytać testu.'));
  }, [lessonId]);

  const dontKnow = test?.scoring.dont_know_option ?? 'Nie wiem / Не знаю';

  const writingPrompt = test?.blocks.find((b) => b.part === 'pisanie')?.variants?.[
    writingVariant
  ];

  const currentLevelBlocks = useMemo(() => {
    if (!test || !['A1', 'A2', 'B1', 'B2'].includes(tab)) return [];
    return test.blocks.filter((b) => b.level === tab);
  }, [test, tab]);

  const setAnswer = useCallback((id: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }, []);

  const start = () => {
    if (!imie.trim()) return;
    setUnlocked((u) => new Set([...u, 'A1']));
    setTab('A1');
  };

  const submitLevel = async () => {
    if (!test || busy) return;
    const level = tab as 'A1' | 'A2' | 'B1' | 'B2';
    const levelItemIds = currentLevelBlocks.flatMap((b) =>
      (b.items ?? []).map((it) => it.id)
    );
    const payload: Record<string, string> = {};
    for (const id of levelItemIds) {
      if (answers[id] != null) payload[id] = answers[id];
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/placement/${lessonId}/level`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level,
          answers: payload,
          priorTokens: levelTokens,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'error');
      setLevelTokens((t) => [...t, data.token]);
      setDoneLevels((d) => new Set([...d, level]));
      if (data.next === 'pisanie') {
        if (data.writingVariant === 'A' || data.writingVariant === 'B') {
          setWritingVariant(data.writingVariant);
        }
        setUnlocked((u) => new Set([...u, 'Pisanie']));
        setTab('Pisanie');
      } else {
        setUnlocked((u) => new Set([...u, data.next]));
        setTab(data.next as Tab);
      }
    } catch {
      setLoadError('Nie udało się zapisać odpowiedzi. Spróbuj jeszcze raz.');
    } finally {
      setBusy(false);
    }
  };

  const submitWriting = async () => {
    if (!test || busy) return;
    setBusy(true);
    try {
      const minutes = (Date.now() - startedAt) / 60000;
      const res = await fetch(`/api/placement/${lessonId}/finish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imie: imie.trim(),
          writingText: writing,
          minutes,
          levelTokens,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'error');
      setResult(data);
      setUnlocked((u) => new Set([...u, 'Wynik']));
      setTab('Wynik');
    } catch {
      setLoadError('Nie udało się zapisać wyniku. Spróbuj jeszcze raz.');
    } finally {
      setBusy(false);
    }
  };

  if (loadError && !test) {
    return <p className="nb-note">{loadError}</p>;
  }
  if (!test) {
    return <p className="nb-note">Ładowanie testu…</p>;
  }

  const tabs: Tab[] = ['Start', 'A1', 'A2', 'B1', 'B2', 'Pisanie', 'Wynik'];
  const tabColors = ['#FFE168', '#A9DCC6', '#BCDCF2', '#F6C2AF', '#D8CFF0', '#FFF0B8', '#E9E3F8'];

  return (
    <div className="placement">
      <header className="nb-head">
        <p className="nb-eyebrow">test poziomujący · A1–B2</p>
        <h1>{test.title}</h1>
        <p>{test.instruction}</p>
      </header>

      <nav className="nb-idx placement-tabs" aria-label="Etapy testu">
        {tabs.map((t, i) => {
          const open = unlocked.has(t);
          const done =
            (t !== 'Start' && t !== 'Pisanie' && t !== 'Wynik' && doneLevels.has(t)) ||
            (t === 'Pisanie' && Boolean(result)) ||
            (t === 'Wynik' && Boolean(result));
          return (
            <button
              key={t}
              type="button"
              aria-selected={tab === t}
              disabled={!open}
              style={{
                background: tab === t ? tabColors[i] : undefined,
                opacity: open ? 1 : 0.45,
              }}
              onClick={() => open && setTab(t)}
            >
              {done ? '✓ ' : ''}
              {t}
            </button>
          );
        })}
      </nav>

      {loadError ? <p className="nb-note">{loadError}</p> : null}

      {tab === 'Start' ? (
        <section className="placement-panel">
          <h2 className="placement-h2">Sprawdź swój poziom polskiego</h2>
          <p>
            Ten test pokaże, od czego zaczniemy naukę. To nie egzamin — nie da się go
            „oblać”.
          </p>
          <p className="nb-note">
            Цей тест покаже, з чого почнемо навчання. Це не іспит — його неможливо
            «завалити».
          </p>
          <ul className="placement-rules">
            <li>Bez słownika i tłumacza.</li>
            <li>Nie wiesz? Wybierz „Nie wiem”.</li>
            <li>Zakończonej części nie można poprawić.</li>
            <li>Czas: ok. 20–55 minut, bez limitu.</li>
          </ul>
          <label className="placement-label">
            Jak masz na imię? / Як тебе звати?
            <input
              className="placement-name"
              value={imie}
              onChange={(e) => setImie(e.target.value)}
              autoComplete="given-name"
            />
          </label>
          <div className="nb-row">
            <button
              type="button"
              className="nb-btn"
              disabled={!imie.trim()}
              onClick={start}
            >
              Zaczynam
            </button>
          </div>
        </section>
      ) : null}

      {['A1', 'A2', 'B1', 'B2'].includes(tab) ? (
        <section className="placement-panel">
          {currentLevelBlocks.map((block) => (
            <div key={block.block_id} className="placement-block">
              <h2 className="placement-h2">{block.title}</h2>
              {block.instruction ? (
                <p className="nb-note">{block.instruction}</p>
              ) : null}

              {block.passage ? (
                <div className="placement-reading">
                  <button
                    type="button"
                    className="placement-toggle"
                    onClick={() => setShowPassage((s) => !s)}
                  >
                    {showPassage ? 'ukryj tekst ↑' : 'pokaż tekst ↓'}
                  </button>
                  <div
                    className={`placement-passage ${showPassage ? 'open' : ''}`}
                  >
                    {block.passage_title ? <h3>{block.passage_title}</h3> : null}
                    {block.passage.split('\n\n').map((p, i) => (
                      <p key={i}>{p}</p>
                    ))}
                  </div>
                </div>
              ) : null}

              <ol className="placement-items">
                {(block.items ?? []).map((item, idx) => {
                  const opts = item.options
                    ? shuffle([...item.options, dontKnow], `${seed}:${item.id}`)
                    : [dontKnow];
                  const vertical =
                    (item.options ?? []).some((o) => o.length > 36) ||
                    block.part === 'czytanie';
                  const isOpen = Boolean(item.open) || !item.options?.length;
                  return (
                    <li key={item.id} className="placement-item">
                      <p className="placement-q">
                        <span className="placement-num">{idx + 1}.</span>{' '}
                        {item.text.includes('___')
                          ? item.text.split('___').map((part, i, arr) => (
                              <span key={i}>
                                {part}
                                {i < arr.length - 1 ? (
                                  <span className="placement-blank-mark">……</span>
                                ) : null}
                              </span>
                            ))
                          : item.text}
                      </p>

                      {isOpen && item.options == null ? (
                        <OpenAnswer
                          id={item.id}
                          value={answers[item.id] ?? ''}
                          onChange={(v) => setAnswer(item.id, v)}
                          dontKnow={dontKnow}
                          selectedDontKnow={answers[item.id] === dontKnow}
                        />
                      ) : (
                        <div
                          className={
                            vertical ? 'placement-picks vertical' : 'placement-picks'
                          }
                        >
                          {opts.map((opt) => {
                            const selected = answers[item.id] === opt;
                            const isDk = opt === dontKnow;
                            return (
                              <button
                                key={opt}
                                type="button"
                                className={`placement-pick${selected ? ' on' : ''}${
                                  isDk ? ' dk' : ''
                                }`}
                                onClick={() => setAnswer(item.id, opt)}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}

          <div className="nb-row">
            <button
              type="button"
              className="nb-btn"
              disabled={busy || doneLevels.has(tab)}
              onClick={submitLevel}
            >
              {busy ? 'Zapisywanie…' : 'Dalej'}
            </button>
            <span className="nb-score">sprawdź odpowiedzi przed Dalej</span>
          </div>
        </section>
      ) : null}

      {tab === 'Pisanie' && writingPrompt ? (
        <section className="placement-panel">
          <h2 className="placement-h2">Pisanie</h2>
          <p>{writingPrompt.prompt_pl}</p>
          <p className="nb-note">{writingPrompt.prompt_uk}</p>
          <textarea
            className="placement-writing"
            value={writing}
            onChange={(e) => setWriting(e.target.value)}
            rows={10}
          />
          <DiacriticRow
            onInsert={(ch) => {
              setWriting((w) => `${w}${ch}`);
            }}
          />
          <p className="nb-score">
            słów: {wordCount(writing)} · zalecane {writingPrompt.min_words}–
            {writingPrompt.max_words}
          </p>
          <div className="nb-row">
            <button
              type="button"
              className="nb-btn"
              disabled={busy || !writing.trim()}
              onClick={submitWriting}
            >
              {busy ? 'Liczenie wyniku…' : 'Zakończ test'}
            </button>
          </div>
        </section>
      ) : null}

      {tab === 'Wynik' && result ? (
        <section className="placement-panel placement-result">
          <div className="placement-stamp">{result.display}</div>
          {result.level.includes('+') ? (
            <p className="placement-plus">{result.level}</p>
          ) : null}
          <div className="placement-sticker">
            <p>{result.text_pl}</p>
            {result.plus_note_pl ? <p>{result.plus_note_pl}</p> : null}
          </div>
          <p className="placement-uk">{result.text_uk}</p>
          {result.plus_note_uk ? (
            <p className="placement-uk">{result.plus_note_uk}</p>
          ) : null}
          <p className="nb-note">{result.footer_pl}</p>
          <p className="nb-note">{result.footer_uk}</p>
        </section>
      ) : null}
    </div>
  );
}

function DiacriticRow({ onInsert }: { onInsert: (ch: string) => void }) {
  return (
    <div className="placement-diacritics" aria-label="Polskie znaki">
      {DIACRITICS.map((ch) => (
        <button key={ch} type="button" onClick={() => onInsert(ch)}>
          {ch}
        </button>
      ))}
    </div>
  );
}

function OpenAnswer({
  id,
  value,
  onChange,
  dontKnow,
  selectedDontKnow,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  dontKnow: string;
  selectedDontKnow: boolean;
}) {
  return (
    <div className="placement-open">
      <input
        id={id}
        className="placement-blank"
        value={selectedDontKnow ? '' : value}
        disabled={selectedDontKnow}
        onChange={(e) => onChange(e.target.value)}
      />
      <DiacriticRow
        onInsert={(ch) => {
          if (selectedDontKnow) return;
          const el = document.getElementById(id) as HTMLInputElement | null;
          const start = el?.selectionStart ?? value.length;
          const end = el?.selectionEnd ?? value.length;
          const next = insertAtCursor(value, ch, start, end);
          onChange(next.value);
          requestAnimationFrame(() => {
            el?.setSelectionRange(next.caret, next.caret);
            el?.focus();
          });
        }}
      />
      <button
        type="button"
        className={`placement-pick dk${selectedDontKnow ? ' on' : ''}`}
        onClick={() => onChange(dontKnow)}
      >
        {dontKnow}
      </button>
    </div>
  );
}
