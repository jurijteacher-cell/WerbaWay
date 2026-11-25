'use client';

import { useEffect, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react';
import { applyLiveAudio, liveAudioState, resumeLiveAudio, setLiveAudioMuted, subscribeLiveAudio, type LiveAudioRec } from '@/lib/live-audio';
import { hasLiveState, isSpectator, setLiveState } from '@/lib/embed-progress';
import { liveKey } from '@/lib/live/protocol';
import { useT } from '@/i18n/client';

/** Типи вправ, що наживо не показуються: свій сховище й запити до API на кожному кроці */
const NOT_LIVE = /^\/embed\/[^/]+\/placement(\/|$)/;

/**
 * Вікно вправи в режимі «Дивитися учня» (iframe викладача з ?ww_watch=1).
 * Стан учня приходить від батьківської сторінки (LiveWatch) повідомленням `ww-live-state`;
 * вправи читають його з пам'яті через embed-progress (loadProgress у режимі спостерігача),
 * і самі підставляють нові значення в уже відкриту вправу (useLiveTick) — без перемонтування й блимання.
 * Поза «Дивитися» компонент нічого не робить: віддає children як є.
 */
export function LiveSpectator({ children }: { children: ReactNode }) {
  const t = useT();
  const [spec, setSpec] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [has, setHas] = useState(false);
  const au = useSyncExternalStore(subscribeLiveAudio, liveAudioState, liveAudioState);

  useEffect(() => {
    if (!isSpectator()) return;
    setSpec(true);
    if (NOT_LIVE.test(window.location.pathname)) setBlocked(true);
    const key = liveKey(window.location.href);
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== window.parent) return;
      const d = e.data as { type?: string; s?: Record<string, unknown>; full?: boolean } | null;
      if (!d || d.type !== 'ww-live-state') return;
      const st = d.s ?? {};
      if ('mx-audio' in st) applyLiveAudio(st['mx-audio'] as LiveAudioRec | null, !!d.full);
      // вправи самі підхоплюють нове значення (useLiveTick) — без перемонтування, тож нічого не блимає
      setLiveState(st, !!d.full);
      if (d.full || Object.keys(st).some((k) => k !== 'mx-audio')) setHas(hasLiveState());
    };

    window.addEventListener('message', onMessage);
    // батьківська сторінка відповість збереженим станом і попросить свіжий в учня
    window.parent.postMessage({ type: 'ww-live-hello', key }, window.location.origin);
    return () => {
      window.removeEventListener('message', onMessage);
    };
  }, []);

  if (!spec) return <>{children}</>;

  const note: CSSProperties = {
    margin: '0 0 10px',
    padding: '6px 12px',
    borderRadius: 8,
    background: '#eef1fb',
    color: '#4a5278',
    fontSize: 13,
  };

  if (blocked) {
    return <p style={note}>{t('Цей тип вправи наживо не показується.')}</p>;
  }
  return (
    <>
      <p style={note}>
        👁 {has ? t('Відповіді учня · наживо') : t('Учень ще нічого не вписав')}
        {au.active ? (
          <>
            {' · '}
            {au.blocked ? (
              <button type="button" onClick={resumeLiveAudio} style={{ font: 'inherit', textDecoration: 'underline', cursor: 'pointer', background: 'none', border: 0, color: 'inherit' }}>
                🔊 {t('Увімкнути звук учня')}
              </button>
            ) : (
              <button type="button" onClick={() => setLiveAudioMuted(!au.muted)} style={{ font: 'inherit', textDecoration: 'underline', cursor: 'pointer', background: 'none', border: 0, color: 'inherit' }}>
                {au.muted ? `🔇 ${t('Звук учня вимкнено')}` : `🔊 ${t('Чути запис учня')}`}
              </button>
            )}
          </>
        ) : null}
      </p>
      {children}
    </>
  );
}
