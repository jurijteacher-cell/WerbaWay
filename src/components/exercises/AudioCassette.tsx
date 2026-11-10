'use client';

import { useEffect, useRef, useState } from 'react';
import { Play } from 'lucide-react';
import { AudioTransport } from './AudioTransport';

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
  const [paused, setPaused] = useState(false);
  const limited = maxPlays != null;
  const disabled = limited && playsLeft <= 0;

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [speed]);

  const finishPlay = () => {
    if (!playing) return;
    setPlaying(false);
    setPaused(false);
    if (limited) setPlaysLeft((n) => Math.max(0, n - 1));
  };

  const play = () => {
    const cur = audioRef.current;
    if (playing && cur && src) {
      // session already running: toggle pause / resume
      if (paused) {
        void cur.play().catch(() => undefined);
        setPaused(false);
      } else {
        cur.pause();
        setPaused(true);
      }
      return;
    }
    if (disabled || playing) return;
    setPlaying(true);
    setPaused(false);
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
        disabled={disabled && !playing}
        onClick={play}
        aria-label={playing ? (paused ? 'Wznów' : 'Pauza') : label}
      >
        {playing && paused ? (
          <Play aria-hidden fill="currentColor" />
        ) : playing ? (
          <span className="nb-eq" aria-hidden>
            <i />
            <i />
            <i />
          </span>
        ) : (
          <Play aria-hidden fill="currentColor" />
        )}
        {playing ? (paused ? 'Wznów' : 'Pauza') : label}
      </button>
      {limited ? (
        <span className="nb-cassette-left">
          {playsLeft > 0 ? `odsłuchy: ${playsLeft}` : 'brak odsłuchów'}
        </span>
      ) : null}
      {src ? (
        <AudioTransport
          audioRef={audioRef}
          enabled={playing}
          onStop={() => setPaused(true)}
        />
      ) : null}
      <div className="nb-cassette-speeds" aria-label="Prędkość">
        {SPEEDS.map((s) => (
          <button
            key={s}
            type="button"
            className={`nb-speed${speed === s ? ' on' : ''}`}
            onClick={() => setSpeed(s)}
          >
            {s}×
          </button>
        ))}
      </div>
    </div>
  );
}
