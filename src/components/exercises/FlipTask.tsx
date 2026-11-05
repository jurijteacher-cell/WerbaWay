'use client';

import { useState, type CSSProperties } from 'react';
import { RefreshCw } from 'lucide-react';
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
  instructionsUk?: string;
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
          <p key={i}>
            {turn.speaker ? <strong>{turn.speaker}</strong> : null}
            {text}
          </p>
        );
      })}
    </div>
  );
}

/** Communication tasks: situation cards that flip (scenario + checklist on the back). Embed-only. */
export function FlipTask({ title, instructions, instructionsUk, items, underCardAudio }: Props) {
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});

  return (
    <div data-block-id="comm-tasks">
      <header className="nb-head">
        <p className="nb-eyebrow">zadania komunikacyjne</p>
        <h1>{title}</h1>
        {instructions ? <p>{instructions}</p> : null}
        {instructionsUk ? <p className="nb-instruction-uk">{instructionsUk}</p> : null}
      </header>

      <div className="nb-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
        {items.map((item, i) => {
          const key = String(item.id);
          const isBack = !!flipped[key];
          const isReadThenPlay = item.mode === 'read-then-play';
          const showDialogue =
            (isReadThenPlay || item.mode === 'listen-then-play') && (item.model_dialogue?.length ?? 0) > 0;
          const dialogue = item.model_dialogue ?? [];
          const audioSrc =
            underCardAudio?.itemId === key ? underCardAudio.src ?? item.audio_url : item.audio_url;
          const flip = () => setFlipped((prev) => ({ ...prev, [key]: !prev[key] }));

          return (
            <div key={key} style={{ '--i': i, display: 'flex', flexDirection: 'column' } as CSSProperties}>
              <div
                className={`nb-flip ${COLORS[i % COLORS.length]}`}
                style={{ flex: 1 }}
                data-item-id={key}
                data-flipped={isBack ? 'true' : 'false'}
                data-mode={item.mode || undefined}
              >
                <div className="nb-flip-in">
                  <button
                    type="button"
                    data-role="flip"
                    className="nb-face front"
                    aria-hidden={isBack}
                    tabIndex={isBack ? -1 : 0}
                    onClick={flip}
                  >
                    <span className="big" aria-hidden>
                      {i + 1}
                    </span>
                    <span className="pos">sytuacja</span>
                    <h3 className="task">{item.front_title}</h3>
                    <span className="peek">
                      <RefreshCw aria-hidden /> odwróć kartę
                    </span>
                  </button>
                  <button
                    type="button"
                    className="nb-face back"
                    aria-hidden={!isBack}
                    tabIndex={isBack ? 0 : -1}
                    onClick={flip}
                  >
                    <span style={{ display: 'block' }}>{item.back_scenario}</span>
                    {item.back_checklist?.length ? (
                      <ul>
                        {item.back_checklist.map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                      </ul>
                    ) : null}
                  </button>
                </div>
              </div>
              {showDialogue ? <DialogueScript lines={dialogue} /> : null}
              {!isReadThenPlay && audioSrc ? <AudioCassette src={audioSrc} defaultSpeed={0.75} /> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
