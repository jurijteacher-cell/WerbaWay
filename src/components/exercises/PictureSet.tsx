'use client';

import { useRef, useState, type CSSProperties } from 'react';
import { Plus } from 'lucide-react';
import { SendToTeacher } from './SendToTeacher';
import { PolishKeys, TaskTip } from './nb-ui';

type Item = {
  id: number | string;
  question: string;
  label?: string;
  note?: string;
  alt?: string;
  image_url?: string;
  helper_questions?: string[];
  image_status?: 'ok' | 'missing';
};

type Props = {
  title: string;
  instructions?: string;
  phrase_bank?: string[];
  items: Item[];
};

/** Photo description (UI v2): photo card + question + answer sent to the teacher. Embed-only: nb-* classes. */
export function PictureSet({ title, instructions, phrase_bank, items }: Props) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const lastField = useRef<HTMLTextAreaElement | null>(null);
  const lastKey = useRef<string | null>(null);

  /** Phrase chips insert into the last answer field the student was writing in. */
  const insertPhrase = (phrase: string) => {
    const el = lastField.current;
    const key = lastKey.current ?? String(items[0]?.id ?? '');
    const cur = answers[key] ?? '';
    const start = el?.selectionStart ?? cur.length;
    const end = el?.selectionEnd ?? cur.length;
    const before = cur.slice(0, start);
    const glue = before && !/\s$/.test(before) ? ' ' : '';
    const text = phrase.replace(/\s*(…|\.\.\.)\s*$/, ' ');
    const next = before + glue + text + cur.slice(end);
    setAnswers((a) => ({ ...a, [key]: next }));
    requestAnimationFrame(() => {
      const target = el ?? document.querySelector<HTMLTextAreaElement>(`[data-pk="${key}"]`);
      if (!target) return;
      target.focus();
      const pos = (before + glue + text).length;
      target.setSelectionRange(pos, pos);
    });
  };

  return (
    <div data-block-id="pictures">
      <header className="nb-head">
        <p className="nb-eyebrow">opis zdjęć</p>
        <h1>{title}</h1>
        {instructions ? <p>{instructions}</p> : null}
        <TaskTip kind="write" />
      </header>

      {phrase_bank && phrase_bank.length > 0 && (
        <div style={{ margin: '0 0 18px' }}>
          <p className="nb-eyebrow">przydatne wyrażenia · kliknij, żeby wstawić</p>
          <div className="nb-opts" aria-label="Wyrażenia">
            {phrase_bank.map((phrase) => (
              <button
                key={phrase}
                type="button"
                className="nb-chip"
                style={{ fontSize: 15, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => insertPhrase(phrase)}
              >
                <Plus size={14} aria-hidden style={{ color: 'var(--nb-gold)' }} />
                {phrase}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="nb-list">
        {items.map((item, i) => {
          const key = String(item.id);
          const status = item.image_status ?? (item.image_url ? 'ok' : 'missing');
          const value = answers[key] ?? '';
          const words = value.trim() ? value.trim().split(/\s+/).length : 0;

          return (
            <section
              key={key}
              className="nb-panel nb-item"
              style={{ '--i': i } as CSSProperties}
              data-item-id={key}
              data-image-status={status}
            >
              <span className="nb-item-num" aria-hidden>
                {i + 1}
              </span>
              <div>
                {item.label ? <p className="nb-tape">{item.label}</p> : null}

                <figure className="nb-polaroid" style={{ display: 'block', width: 'fit-content' }}>
                  {status === 'ok' && item.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.image_url} alt={item.alt ?? item.question} loading="lazy" />
                  ) : (
                    <div className="nb-polaroid-missing">zdjęcie wkrótce</div>
                  )}
                  {item.alt ? <figcaption className="nb-polaroid-cap">{item.alt}</figcaption> : null}
                </figure>

                <p className="nb-q" style={{ fontWeight: 600, margin: '4px 0 8px' }}>
                  {item.question}
                </p>

                {item.helper_questions?.length ? (
                  <ul className="nb-helpers">
                    {item.helper_questions.map((q) => (
                      <li key={q} data-role="helper-question">
                        {q}
                      </li>
                    ))}
                  </ul>
                ) : null}

                <textarea
                  className="nb-open"
                  rows={3}
                  placeholder="Twoja odpowiedź…"
                  spellCheck={false}
                  data-pk={key}
                  value={value}
                  onFocus={(e) => {
                    lastField.current = e.currentTarget;
                    lastKey.current = key;
                    setFocusKey(key);
                  }}
                  onBlur={() => setFocusKey((f) => (f === key ? null : f))}
                  onChange={(e) => setAnswers((a) => ({ ...a, [key]: e.target.value }))}
                />
                {focusKey === key ? <PolishKeys /> : null}
                <div className="nb-row" style={{ marginTop: 6 }}>
                  <span className="nb-counter">{words} słów</span>
                </div>
                <SendToTeacher
                  text={value}
                  attempt={{
                    blockId: 'pictures',
                    itemId: `pictures:${key}`,
                    itemType: 'picture-description',
                    grammarPoint: null,
                    prompt: item.question,
                    expected: null,
                  }}
                />
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
