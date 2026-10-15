'use client';

import { useEffect, useRef, useState } from 'react';

type Props = {
  src?: string;
  /** When set, limits plays and exposes data-plays-left */
  maxPlays?: number;
  defaultSpeed?: number;
  label?: string;
};

const SPEEDS = [0.75, 0.9, 1] as const;

export function AudioCassette({
  src,
  maxPlays,
  defaultSpeed = 0.85,
  label = 'Odsłuchaj',
}: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playsLeft, setPlaysLeft] = useState(maxPlays ?? 99);
  const [speed, setSpeed] = useState(defaultSpeed);
  const [playing, setPlaying] = useState(false);
  const limited = maxPlays != null;
  const disabled = limited && playsLeft <= 0;

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [speed]);

  const finishPlay = () => {
    if (!playing) return;
    setPlaying(false);
    if (limited) setPlaysLeft((n) => Math.max(0, n - 1));
  };

  const play = () => {
    if (disabled || playing) return;
    setPlaying(true);
    const el = audioRef.current;
    if (el && src) {
      el.playbackRate = speed;
      el.currentTime = 0;
      void el.play().catch(() => undefined);
    }
  };

  return (
    <div className="nb-cassette">
      {src ? (
        <audio
          ref={audioRef}
          src={src}
          preload="none"
          onEnded={finishPlay}
        />
      ) : (
        /* placeholder so e2e can dispatch ended on an audio node */
        <audio ref={audioRef} preload="none" onEnded={finishPlay} />
      )}
      <button
        type="button"
        className="nb-btn"
        data-role="audio-play"
        data-plays-left={limited ? String(playsLeft) : undefined}
        disabled={disabled}
        onClick={play}
      >
        ▶ {label}
      </button>
      {limited ? (
        <span className="nb-cassette-left">zostały {playsLeft} odsłuchy</span>
      ) : null}
      <div className="nb-cassette-speeds" aria-label="Prędkość">
        {SPEEDS.map((s) => (
          <button
            key={s}
            type="button"
            className={`nb-speed${speed === s ? ' on' : ''}`}
            onClick={() => setSpeed(s)}
          >
            × {s}
          </button>
        ))}
      </div>
    </div>
  );
}
