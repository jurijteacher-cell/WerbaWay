'use client';

import { useState, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import {
  EMBED_RESULTS_ENABLED,
  clearCode,
  getServerState,
  getState,
  setCode,
  subscribe,
} from '@/lib/embed-tracker';

/** Embeds where answers are checked and recorded */
const TRACKED = /^\/embed\/[^/]+\/(grammar|hw|exam|grammar-board)(\/|$)/;

/**
 * «Twój kod» in the notebook brand bar. Embed-only: nb-* classes / --nb-* vars only.
 */
export function StudentCodeBar() {
  const pathname = usePathname() ?? '';
  const s = useSyncExternalStore(subscribe, getState, getServerState);
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);

  if (!EMBED_RESULTS_ENABLED || !TRACKED.test(pathname)) return null;

  if (s.status === 'teacher' && !editing) {
    return (
      <div className="nb-codebar">
        <span>👩‍🏫 tryb nauczyciela</span>
        <button type="button" className="nb-codebar-link" onClick={() => setEditing(true)}>
          zmień
        </button>
      </div>
    );
  }

  if (s.status === 'student' && !editing) {
    return (
      <div className="nb-codebar" title="Twoje odpowiedzi widzi nauczyciel">
        <span>
          👤 {s.name ?? s.code}
          {s.pending > 0 ? ' · zapisuję…' : ' · ✓'}
        </span>
        <button
          type="button"
          className="nb-codebar-link"
          onClick={() => {
            setValue('');
            setEditing(true);
          }}
        >
          to nie ja
        </button>
      </div>
    );
  }

  const submit = async () => {
    if (!value.trim()) return;
    setBusy(true);
    const ok = await setCode(value);
    setBusy(false);
    if (ok) {
      setEditing(false);
      setValue('');
    }
  };

  return (
    <form
      className="nb-codebar nb-codebar-ask"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <label htmlFor="nb-code-input">🔑 Twój kod</label>
      <input
        id="nb-code-input"
        className="nb-blank"
        value={value}
        onChange={(e) => setValue(e.target.value.toUpperCase())}
        placeholder="np. ANNA7"
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        maxLength={12}
        style={{ width: 110 }}
      />
      <button type="submit" className="nb-btn" disabled={busy || !value.trim()}>
        OK
      </button>
      {editing ? (
        <button
          type="button"
          className="nb-codebar-link"
          onClick={() => {
            if (s.status === 'none') return setEditing(false);
            clearCode();
            setEditing(false);
          }}
        >
          {s.status === 'none' ? 'anuluj' : 'wyloguj'}
        </button>
      ) : null}
      {s.error ? <span className="nb-codebar-err">{s.error}</span> : null}
      {s.pending > 0 && !s.error ? (
        <span className="nb-codebar-hint">odpowiedzi czekają na kod ({s.pending})</span>
      ) : null}
    </form>
  );
}
