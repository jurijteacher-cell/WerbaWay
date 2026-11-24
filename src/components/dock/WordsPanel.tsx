'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useT } from '@/i18n/client';
import { MY_DECK_SIZE, type MyWord } from '@/lib/my-words';
import type { ChatRow } from '@/lib/dock/protocol';

type Draft = { term: string; forms: string; translation: string; example: string; example_tr: string };
const EMPTY: Draft = { term: '', forms: '', translation: '', example: '', example_tr: '' };

/**
 * Додати слово + список слів колод власника (по 20 у колоді) з правкою й видаленням.
 * ownerId: учень — свій id; викладач у класі — id учня (слово йде в колоду учня); викладач сам — свій.
 */
export function WordsPanel({
  ownerId,
  forStudent,
  onChat,
  onChanged,
}: {
  ownerId: string;
  /** викладач додає слово учневі: картка слова піде ще й у чат */
  forStudent?: boolean;
  onChat?: (row: ChatRow) => void;
  onChanged?: () => void;
}) {
  const t = useT();
  const supabase = useMemo(() => createClient(), []);
  const [words, setWords] = useState<MyWord[]>([]);
  const [input, setInput] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [source, setSource] = useState<'ai' | 'manual'>('manual');
  const [busy, setBusy] = useState<'suggest' | 'save' | null>(null);
  const [note, setNote] = useState('');
  const [edit, setEdit] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>(EMPTY);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('student_words')
      .select('*')
      .eq('student_id', ownerId)
      .is('deleted_at', null)
      .order('deck_no', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(2000);
    if (data) setWords(data as MyWord[]);
  }, [supabase, ownerId]);
  useEffect(() => {
    void load();
  }, [load]);

  async function suggest() {
    const v = input.trim();
    if (!v || busy) return;
    setBusy('suggest');
    setNote('');
    try {
      const r = await fetch('/api/words/suggest', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ studentId: forStudent ? ownerId : undefined, input: v }),
      });
      const j = (await r.json().catch(() => null)) as { draft?: Draft | null; limited?: boolean; reason?: string } | null;
      if (j?.draft) {
        setDraft({ ...EMPTY, ...j.draft });
        setSource('ai');
      } else {
        setDraft({ ...EMPTY, term: v });
        setSource('manual');
        setNote(
          j?.limited
            ? t('Ліміт підказок на сьогодні вичерпано — заповни картку вручну.')
            : `${t('Підказка недоступна — заповни картку вручну.')}${j?.reason ? ` (${j.reason === 'no-key' ? t('на сервері не заданий OPENAI_API_KEY') : j.reason})` : ''}`
        );
      }
    } catch {
      setDraft({ ...EMPTY, term: v });
      setSource('manual');
      setNote(t('Підказка недоступна — заповни картку вручну.'));
    }
    setBusy(null);
  }

  async function save() {
    if (!draft || busy || !draft.term.trim() || !draft.translation.trim()) return;
    setBusy('save');
    try {
      const r = await fetch('/api/words', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...draft, studentId: forStudent ? ownerId : undefined, source }),
      });
      const j = (await r.json().catch(() => null)) as { word?: MyWord; chat?: ChatRow | null; error?: string } | null;
      if (!r.ok || !j?.word) throw new Error(j?.error ?? 'save');
      setWords((p) => [...p, j.word!]);
      if (j.chat) onChat?.(j.chat);
      setDraft(null);
      setInput('');
      setNote('');
      onChanged?.();
      inputRef.current?.focus();
    } catch {
      setNote(t('Не вдалося зберегти. Спробуй ще раз.'));
    }
    setBusy(null);
  }

  async function saveEdit(id: string) {
    const r = await fetch(`/api/words/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(editDraft) });
    const j = (await r.json().catch(() => null)) as { word?: MyWord } | null;
    if (!r.ok || !j?.word) return setNote(t('Не вдалося зберегти. Спробуй ще раз.'));
    setWords((p) => p.map((w) => (w.id === id ? j.word! : w)));
    setEdit(null);
    onChanged?.();
  }

  async function remove(w: MyWord) {
    if (!window.confirm(t('Видалити слово «{w}»?', { w: w.term }))) return;
    const r = await fetch(`/api/words/${w.id}`, { method: 'DELETE' });
    if (!r.ok) return setNote(t('Не вдалося видалити. Спробуй ще раз.'));
    setWords((p) => p.filter((x) => x.id !== w.id));
    onChanged?.();
  }

  const decks = useMemo(() => {
    const m = new Map<number, MyWord[]>();
    for (const w of words) m.set(w.deck_no, [...(m.get(w.deck_no) ?? []), w]);
    return [...m.entries()].sort((a, b) => a[0] - b[0]);
  }, [words]);

  const field = (k: keyof Draft, label: string, d: Draft, set: (x: Draft) => void, big?: boolean) => (
    <label className="ww-field">
      <span>{label}</span>
      {big ? (
        <textarea className="ww-input" rows={2} value={d[k]} onChange={(e) => set({ ...d, [k]: e.target.value })} />
      ) : (
        <input className="ww-input" value={d[k]} onChange={(e) => set({ ...d, [k]: e.target.value })} />
      )}
    </label>
  );

  return (
    <div className="ww-words" data-testid="words-panel">
      <form
        className="ww-words-add"
        onSubmit={(e) => {
          e.preventDefault();
          void suggest();
        }}
      >
        <input
          ref={inputRef}
          className="ww-input"
          value={input}
          placeholder={t('Слово: польською чи своєю мовою')}
          aria-label={t('Нове слово')}
          maxLength={120}
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="submit" className="ww-btn ww-btn-primary ww-btn-sm" disabled={!input.trim() || busy === 'suggest'}>
          {busy === 'suggest' ? '…' : t('Додати')}
        </button>
      </form>
      {forStudent && <p className="ww-words-hint">{t('Слово піде в колоду учня.')}</p>}
      {note && <p className="ww-words-note">{note}</p>}

      {draft && (
        <div className="ww-words-draft">
          {field('term', t('Слово'), draft, setDraft)}
          {field('forms', t('Форми'), draft, setDraft)}
          {field('translation', t('Переклад'), draft, setDraft)}
          {field('example', t('Приклад'), draft, setDraft, true)}
          {field('example_tr', t('Переклад прикладу'), draft, setDraft, true)}
          <div className="ww-words-actions">
            <button type="button" className="ww-btn ww-btn-ghost ww-btn-sm" onClick={() => setDraft(null)}>
              {t('Скасувати')}
            </button>
            <button type="button" className="ww-btn ww-btn-primary ww-btn-sm" onClick={() => void save()} disabled={busy === 'save' || !draft.term.trim() || !draft.translation.trim()}>
              {t('Зберегти в колоду')}
            </button>
          </div>
        </div>
      )}

      {decks.length === 0 && !draft && <p className="ww-words-empty">{t('Колод ще немає. Додай перше слово — воно потрапить у «Мої колоди».')}</p>}
      {decks.map(([n, list]) => (
        <section key={n} className="ww-words-deck">
          <p className="ww-label">
            {t('Колода {n}', { n })} · {list.length}/{MY_DECK_SIZE}
          </p>
          <ul>
            {list.map((w) =>
              edit === w.id ? (
                <li key={w.id} className="ww-words-draft">
                  {field('term', t('Слово'), editDraft, setEditDraft)}
                  {field('translation', t('Переклад'), editDraft, setEditDraft)}
                  {field('example', t('Приклад'), editDraft, setEditDraft, true)}
                  {field('example_tr', t('Переклад прикладу'), editDraft, setEditDraft, true)}
                  <div className="ww-words-actions">
                    <button type="button" className="ww-btn ww-btn-ghost ww-btn-sm" onClick={() => setEdit(null)}>
                      {t('Скасувати')}
                    </button>
                    <button type="button" className="ww-btn ww-btn-primary ww-btn-sm" onClick={() => void saveEdit(w.id)}>
                      {t('Зберегти')}
                    </button>
                  </div>
                </li>
              ) : (
                <li key={w.id} className="ww-words-row">
                  <span className="ww-words-text">
                    <b>{w.term}</b> — {w.translation}
                    {w.example && <small>{w.example}</small>}
                  </span>
                  <button
                    type="button"
                    className="ww-words-ico"
                    aria-label={t('Правити слово')}
                    onClick={() => {
                      setEdit(w.id);
                      setEditDraft({ term: w.term, forms: w.forms ?? '', translation: w.translation, example: w.example ?? '', example_tr: w.example_tr ?? '' });
                    }}
                  >
                    <Pencil size={15} aria-hidden="true" />
                  </button>
                  <button type="button" className="ww-words-ico is-danger" aria-label={t('Видалити слово')} onClick={() => void remove(w)}>
                    <Trash2 size={15} aria-hidden="true" />
                  </button>
                </li>
              )
            )}
          </ul>
        </section>
      ))}
    </div>
  );
}
