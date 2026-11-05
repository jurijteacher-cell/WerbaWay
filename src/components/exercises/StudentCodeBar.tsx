'use client';

import { useState, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import {
  EMBED_RESULTS_ENABLED,
  clearCode,
  codeFromUrl,
  createCode,
  getServerState,
  getState,
  setCode,
  subscribe,
} from '@/lib/embed-tracker';

/** Embeds where answers are checked and recorded */
const TRACKED = /^\/embed\/[^/]+\/(grammar|hw|exam|grammar-board)(\/|$)/;

/**
 * «Twój kod» in the notebook brand bar: enter a code, create one from your name,
 * log out. Embed-only: nb-* classes / --nb-* vars only.
 */
export function StudentCodeBar() {
  const pathname = usePathname() ?? '';
  const s = useSyncExternalStore(subscribe, getState, getServerState);
  const [mode, setMode] = useState<'code' | 'new'>('code');
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [justCreated, setJustCreated] = useState<string | null>(null);

  if (!EMBED_RESULTS_ENABLED || !TRACKED.test(pathname)) return null;

  const logout = () => {
    setJustCreated(null);
    setValue('');
    setMode('code');
    clearCode();
  };

  if (s.status === 'teacher') {
    return (
      <div className="nb-codebar">
        <span>👩‍🏫 tryb nauczyciela</span>
        <button type="button" className="nb-codebar-link" onClick={logout}>
          wyjdź
        </button>
      </div>
    );
  }

  if (s.status === 'student') {
    return (
      <div className={`nb-codebar${justCreated ? ' nb-codebar-new' : ''}`} title="Twoje odpowiedzi widzi nauczyciel">
        {justCreated ? (
          <>
            <span>
              ✨ Twój kod: <b className="nb-codebar-code">{justCreated}</b>
            </span>
            <span className="nb-codebar-hint">Zapisz go — wpisz go na innym urządzeniu.</span>
            <button type="button" className="nb-btn" onClick={() => setJustCreated(null)}>
              OK
            </button>
          </>
        ) : (
          <>
            <span>
              👤 {s.name ?? s.code}
              {s.name && s.code ? <span className="nb-codebar-hint"> · {s.code}</span> : null}
              {s.pending > 0 ? ' · zapisuję…' : ' · ✓'}
            </span>
            {!codeFromUrl() ? (
              <button type="button" className="nb-codebar-link" onClick={logout}>
                wyloguj
              </button>
            ) : null}
          </>
        )}
      </div>
    );
  }

  const submit = async () => {
    if (!value.trim()) return;
    setBusy(true);
    if (mode === 'code') {
      const ok = await setCode(value);
      if (ok) setValue('');
    } else {
      const code = await createCode(value);
      if (code) {
        setJustCreated(code);
        setValue('');
      }
    }
    setBusy(false);
  };

  const switchMode = () => {
    setMode((m) => (m === 'code' ? 'new' : 'code'));
    setValue('');
  };

  return (
    <form
      className="nb-codebar nb-codebar-ask"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <label htmlFor="nb-code-input">{mode === 'code' ? '🔑 Twój kod' : '✨ Jak masz na imię?'}</label>
      <input
        id="nb-code-input"
        className="nb-blank"
        value={value}
        onChange={(e) => setValue(mode === 'code' ? e.target.value.toUpperCase() : e.target.value)}
        placeholder={mode === 'code' ? 'np. ANNA47' : 'np. Anna K.'}
        autoComplete={mode === 'code' ? 'off' : 'given-name'}
        autoCapitalize={mode === 'code' ? 'characters' : 'words'}
        spellCheck={false}
        maxLength={mode === 'code' ? 12 : 40}
        style={{ width: mode === 'code' ? 110 : 140 }}
      />
      <button type="submit" className="nb-btn" disabled={busy || !value.trim()}>
        {mode === 'code' ? 'OK' : 'Utwórz kod'}
      </button>
      <button type="button" className="nb-codebar-link" onClick={switchMode}>
        {mode === 'code' ? 'nie mam kodu' : 'mam już kod'}
      </button>
      {s.error ? <span className="nb-codebar-err">{s.error}</span> : null}
      {s.pending > 0 && !s.error ? (
        <span className="nb-codebar-hint">odpowiedzi czekają na kod ({s.pending})</span>
      ) : null}
    </form>
  );
}
