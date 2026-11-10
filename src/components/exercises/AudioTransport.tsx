'use client';

import { useEffect, useState, type RefObject } from 'react';
import { RotateCcw, RotateCw, Square } from 'lucide-react';

type Props = {
  audioRef: RefObject<HTMLAudioElement | null>;
  /** Controls are live only while a listening session is running (playing or paused). */
  enabled: boolean;
  /** Called after Stop: the player returns to 0:00 but the session stays open. */
  onStop?: () => void;
  className?: string;
};

const fmt = (s: number) => {
  const t = Math.max(0, Math.floor(Number.isFinite(s) ? s : 0));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
};

/**
 * Stop, ±10 s and a seek bar for an <audio> element owned by the parent.
 * Used by every exercise that plays a recording (cassette, exam tasks, mock exam).
 */
export function AudioTransport({ audioRef, enabled, onStop, className }: Props) {
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(0);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const sync = () => {
      setTime(el.currentTime || 0);
      setDur(Number.isFinite(el.duration) ? el.duration : 0);
    };
    const evs = ['timeupdate', 'loadedmetadata', 'durationchange', 'seeked', 'emptied', 'ended'];
    evs.forEach((e) => el.addEventListener(e, sync));
    sync();
    return () => evs.forEach((e) => el.removeEventListener(e, sync));
  }, [audioRef]);

  const seek = (to: number) => {
    const el = audioRef.current;
    if (!el) return;
    const max = Number.isFinite(el.duration) ? el.duration : to;
    el.currentTime = Math.min(Math.max(0, to), max);
    setTime(el.currentTime);
  };

  const stop = () => {
    const el = audioRef.current;
    if (!el) return;
    el.pause();
    el.currentTime = 0;
    setTime(0);
    onStop?.();
  };

  return (
    <div className={`nb-transport${className ? ` ${className}` : ''}`}>
      <button
        type="button"
        className="nb-tbtn"
        disabled={!enabled}
        onClick={stop}
        aria-label="Stop — wróć na początek"
        title="Stop — wróć na początek"
      >
        <Square aria-hidden size={14} fill="currentColor" />
      </button>
      <button
        type="button"
        className="nb-tbtn"
        disabled={!enabled}
        onClick={() => seek((audioRef.current?.currentTime ?? 0) - 10)}
        aria-label="Cofnij o 10 sekund"
        title="Cofnij o 10 s"
      >
        <RotateCcw aria-hidden size={15} />
        <span>10</span>
      </button>
      <button
        type="button"
        className="nb-tbtn"
        disabled={!enabled}
        onClick={() => seek((audioRef.current?.currentTime ?? 0) + 10)}
        aria-label="Do przodu o 10 sekund"
        title="Do przodu o 10 s"
      >
        <span>10</span>
        <RotateCw aria-hidden size={15} />
      </button>
      <input
        type="range"
        className="nb-seek"
        min={0}
        max={dur || 1}
        step={0.1}
        value={Math.min(time, dur || 1)}
        disabled={!enabled || !dur}
        onChange={(e) => seek(Number(e.target.value))}
        aria-label="Pozycja nagrania"
      />
      <span className="nb-ttime">
        {fmt(time)} / {fmt(dur)}
      </span>
    </div>
  );
}
