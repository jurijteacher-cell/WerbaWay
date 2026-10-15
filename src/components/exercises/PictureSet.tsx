'use client';

import { useState } from 'react';

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

export function PictureSet({ title, instructions, phrase_bank, items }: Props) {
  const [answers, setAnswers] = useState<Record<string, string>>({});

  return (
    <div data-block-id="pictures">
      <header className="nb-head">
        <p className="nb-eyebrow">opis zdjęć</p>
        <h1>{title}</h1>
        {instructions ? <p>{instructions}</p> : null}
      </header>

      {phrase_bank && phrase_bank.length > 0 && (
        <div className="nb-phrases" aria-label="Karteczki z wyrażeniami">
          {phrase_bank.map((phrase) => (
            <span key={phrase} className="nb-sticky">
              {phrase}
            </span>
          ))}
        </div>
      )}

      {items.map((item, i) => {
        const key = String(item.id);
        const status = item.image_status ?? (item.image_url ? 'ok' : 'missing');
        const rot = ((i % 3) - 1) * 1.2;

        return (
          <section
            key={key}
            className="nb-cluster"
            style={{ transform: `rotate(${rot * 0.15}deg)` }}
            data-item-id={key}
            data-image-status={status}
          >
            {item.label ? <div className="nb-tape">{item.label}</div> : null}

            <figure className="nb-polaroid">
              {status === 'ok' && item.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.image_url} alt={item.alt ?? item.question} />
              ) : (
                <div className="nb-polaroid-missing">zdjęcie wkrótce</div>
              )}
              {item.alt ? <figcaption className="nb-polaroid-cap">{item.alt}</figcaption> : null}
            </figure>

            <p style={{ fontWeight: 700 }}>{item.question}</p>

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
              value={answers[key] ?? ''}
              onChange={(e) => setAnswers((a) => ({ ...a, [key]: e.target.value }))}
            />
          </section>
        );
      })}
    </div>
  );
}
