'use client';

import { useState } from 'react';
import { AudioCassette } from './AudioCassette';

type DialogueLine = {
  speaker?: string;
  line?: string;
  text?: string;
};

type Item = {
  id: number | string;
  mode?: string;
  front_title: string;
  back_scenario: string;
  back_checklist: string[];
  audio_url?: string;
  model_dialogue?: DialogueLine[];
};

type Props = {
  title: string;
  instructions?: string;
  items: Item[];
  /** Optional audio under a specific card (e.g. c1) */
  underCardAudio?: { itemId: string; src?: string };
};

const COLORS = ['c-y', 'c-m', 'c-s', 'c-c'] as const;

function DialogueScript({ lines }: { lines: DialogueLine[] }) {
  return (
    <div className="nb-dialogue" data-role="model-dialogue">
      {lines.map((turn, i) => {
        const text = turn.line ?? turn.text ?? '';
        return (
          <p key={i} style={{ margin: '0 0 0.5rem' }}>
            {turn.speaker ? <strong>{turn.speaker}: </strong> : null}
            {text}
          </p>
        );
      })}
    </div>
  );
}

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
          const isReadThenPlay = item.mode === 'read-then-play';
          const dialogue = item.model_dialogue ?? [];
          const audioSrc =
            underCardAudio?.itemId === key
              ? underCardAudio.src ?? item.audio_url
              : item.audio_url;

          return (
            <div key={key}>
              <div
                className={`nb-card ${COLORS[i % COLORS.length]}`}
                data-item-id={key}
                data-flipped={isBack ? 'true' : 'false'}
                data-mode={item.mode || undefined}
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
              {isReadThenPlay && dialogue.length > 0 ? (
                <DialogueScript lines={dialogue} />
              ) : null}
              {!isReadThenPlay && audioSrc ? (
                <AudioCassette src={audioSrc} defaultSpeed={0.85} />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
