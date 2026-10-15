'use client';

import { useState } from 'react';
import { AudioCassette } from './AudioCassette';

type Item = {
  id: number | string;
  front_title: string;
  back_scenario: string;
  back_checklist: string[];
  audio_url?: string;
};

type Props = {
  title: string;
  instructions?: string;
  items: Item[];
  /** Optional audio under a specific card (e.g. c1) */
  underCardAudio?: { itemId: string; src?: string };
};

const COLORS = ['c-y', 'c-m', 'c-s', 'c-c'] as const;

export function FlipTask({ title, instructions, items, underCardAudio }: Props) {
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});

  return (
    <div data-block-id="comm-tasks">
      <header className="nb-head">
        <p className="nb-eyebrow">zadania komunikacyjne</p>
        <h1>{title}</h1>
        {instructions ? <p>{instructions}</p> : null}
      </header>

      <div className="nb-grid">
        {items.map((item, i) => {
          const key = String(item.id);
          const isBack = !!flipped[key];
          return (
            <div key={key}>
              <div
                className={`nb-card ${COLORS[i % COLORS.length]}`}
                data-item-id={key}
                data-flipped={isBack ? 'true' : 'false'}
              >
                <button
                  type="button"
                  data-role="flip"
                  className="nb-flip-trigger"
                  onClick={() => setFlipped((prev) => ({ ...prev, [key]: !prev[key] }))}
                >
                  {!isBack ? (
                    <>
                      <h3>{item.front_title}</h3>
                      <div className="peek">kliknij, żeby odwrócić →</div>
                    </>
                  ) : (
                    <>
                      <p style={{ margin: 0 }}>{item.back_scenario}</p>
                      <ul>
                        {item.back_checklist.map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                      </ul>
                    </>
                  )}
                </button>
              </div>
              {underCardAudio?.itemId === key ? (
                <AudioCassette src={underCardAudio.src ?? item.audio_url} defaultSpeed={0.85} />
              ) : item.audio_url ? (
                <AudioCassette src={item.audio_url} defaultSpeed={0.85} />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
