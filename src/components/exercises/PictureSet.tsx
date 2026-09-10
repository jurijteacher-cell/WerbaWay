'use client';

import { useState } from 'react';

type PairImage = {
  role?: string;
  image_keywords?: string;
  alt?: string;
  image_url?: string;
};

type Item = {
  id: number | string;
  question: string;
  label?: string;
  note?: string;
  /** Legacy single image */
  image_url?: string;
  image_keywords?: string;
  alt?: string;
  /** Then/now pair */
  images?: PairImage[];
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
    <div>
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
        const pair =
          item.images && item.images.length >= 2
            ? item.images
            : [
                {
                  role: 'zdjęcie',
                  alt: item.alt,
                  image_url: item.image_url,
                },
              ];
        const rot = ((i % 3) - 1) * 1.2;

        return (
          <section key={key} className="nb-cluster" style={{ transform: `rotate(${rot * 0.15}deg)` }}>
            {item.label ? <div className="nb-tape">{item.label}</div> : null}
            {item.note ? <div className="note">{item.note}</div> : null}

            <div className={pair.length > 1 ? 'nb-pair' : undefined}>
              {pair.map((img, j) => (
                <figure key={`${key}-${j}`} className="nb-polaroid">
                  {img.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img.image_url} alt={img.alt ?? item.question} />
                  ) : (
                    <div
                      style={{
                        height: 140,
                        display: 'grid',
                        placeItems: 'center',
                        color: 'var(--nb-ink-soft)',
                        fontSize: 13,
                      }}
                    >
                      Brak obrazka
                    </div>
                  )}
                  <figcaption>{img.role ?? img.alt ?? ''}</figcaption>
                </figure>
              ))}
            </div>

            <p className="q">{item.question}</p>
            <textarea
              value={answers[key] ?? ''}
              onChange={(e) => setAnswers((prev) => ({ ...prev, [key]: e.target.value }))}
              rows={3}
              placeholder="Twoja odpowiedź…"
            />
          </section>
        );
      })}
    </div>
  );
}
