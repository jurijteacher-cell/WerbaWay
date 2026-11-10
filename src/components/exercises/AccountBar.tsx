'use client';

import { useState, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import {
  clearMessages,
  getServerState,
  getState,
  requestPasswordReset,
  signIn,
  signOut,
  signUp,
  subscribe,
} from '@/lib/embed-auth';
import {
  EMBED_RESULTS_ENABLED,
  getServerState as trackerServer,
  getState as trackerState,
  subscribe as trackerSubscribe,
} from '@/lib/embed-tracker';

/** Embeds where answers are checked and recorded */
const TRACKED = /^\/embed\/[^/]+\/(grammar|hw|exam|mock-exam|grammar-board)(\/|$)/;

type Mode = 'login' | 'register' | 'forgot';

/**
 * Account bar in the notebook brand bar + a login wall on tracked embeds.
 * Embed-only: nb-* classes / --nb-* vars only.
 */
export function AccountBar() {
  const pathname = usePathname() ?? '';
  const a = useSyncExternalStore(subscribe, getState, getServerState);
  const t = useSyncExternalStore(trackerSubscribe, trackerState, trackerServer);

  if (!EMBED_RESULTS_ENABLED || !TRACKED.test(pathname)) return null;
  if (!a.ready) return null;

  if (!a.userId) return <LoginWall />;

  return (
    <div className="nb-codebar" title="Twoje odpowiedzi widzi nauczyciel">
      <span>
        {a.role === 'teacher' ? '👩‍🏫 tryb nauczyciela' : <>👤 {a.name ?? a.email}</>}
        {a.role !== 'teacher' ? (t.pending > 0 ? ' · zapisuję…' : ' · ✓') : null}
      </span>
      {a.info ? <span className="nb-codebar-hint">{a.info}</span> : null}
      {t.error ? <span className="nb-codebar-err">{t.error}</span> : null}
      <button type="button" className="nb-codebar-link" onClick={() => void signOut()}>
        {a.role === 'teacher' ? 'wyjdź' : 'wyloguj'}
      </button>
    </div>
  );
}

function LoginWall() {
  const a = useSyncExternalStore(subscribe, getState, getServerState);
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [done, setDone] = useState<string | null>(null);
  const [localErr, setLocalErr] = useState<string | null>(null);

  const go = (m: Mode) => {
    setMode(m);
    setDone(null);
    setLocalErr(null);
    clearMessages();
  };

  const submit = async () => {
    setLocalErr(null);
    setDone(null);
    if (mode === 'login') {
      await signIn(email, password);
    } else if (mode === 'forgot') {
      if (await requestPasswordReset(email)) {
        setDone('Wysłaliśmy link do zmiany hasła. Sprawdź pocztę (także spam). / Надіслали посилання для зміни пароля — перевір пошту (і спам).');
      }
    } else {
      if (!firstName.trim() || !lastName.trim()) {
        setLocalErr('Podaj imię i nazwisko. / Вкажи ім’я та прізвище.');
        return;
      }
      if (password.length < 8) {
        setLocalErr('Hasło: minimum 8 znaków. / Пароль: мінімум 8 символів.');
        return;
      }
      if (password !== password2) {
        setLocalErr('Hasła nie są takie same. / Паролі не збігаються.');
        return;
      }
      const r = await signUp({ email, password, firstName, lastName });
      if (r === 'confirm-mail') {
        setDone('Wysłaliśmy link potwierdzający. Kliknij go, potem wróć tutaj i zaloguj się. / Надіслали лист із посиланням — підтверди пошту, потім повернись і увійди.');
        setMode('login');
      }
    }
  };

  const err = localErr ?? a.error;

  return (
    <div className="nb-authwall" role="dialog" aria-modal="true" aria-labelledby="nb-auth-title">
      <form
        className="nb-authcard"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <h2 id="nb-auth-title">
          {mode === 'login' ? 'Zaloguj się' : mode === 'register' ? 'Załóż konto' : 'Nie pamiętam hasła'}
        </h2>
        <p className="nb-authlead">
          {mode === 'forgot'
            ? 'Podaj e-mail — wyślemy link do ustawienia nowego hasła. / Вкажи e-mail — надішлемо посилання для нового пароля.'
            : 'Twoje wyniki zapisują się na koncie, a nauczyciel widzi postępy. / Результати зберігаються в акаунті, викладач бачить прогрес.'}
        </p>

        {mode === 'register' ? (
          <div className="nb-authrow">
            <input
              className="nb-blank"
              placeholder="Imię / Ім’я"
              autoComplete="given-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              maxLength={40}
            />
            <input
              className="nb-blank"
              placeholder="Nazwisko / Прізвище"
              autoComplete="family-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              maxLength={40}
            />
          </div>
        ) : null}

        <input
          className="nb-blank"
          type="email"
          placeholder="E-mail"
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        {mode !== 'forgot' ? (
          <input
            className="nb-blank"
            type="password"
            placeholder={mode === 'register' ? 'Hasło (min. 8) / Пароль' : 'Hasło / Пароль'}
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        ) : null}
        {mode === 'register' ? (
          <input
            className="nb-blank"
            type="password"
            placeholder="Powtórz hasło / Повтори пароль"
            autoComplete="new-password"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            required
          />
        ) : null}

        {err ? <p className="nb-authmsg nb-authmsg-err">{err}</p> : null}
        {done ? <p className="nb-authmsg nb-authmsg-ok">{done}</p> : null}

        <button type="submit" className="nb-btn" disabled={a.busy || !email.trim()}>
          {a.busy ? '…' : mode === 'login' ? 'Zaloguj' : mode === 'register' ? 'Utwórz konto' : 'Wyślij link'}
        </button>

        <div className="nb-authlinks">
          {mode !== 'login' ? (
            <button type="button" className="nb-codebar-link" onClick={() => go('login')}>
              mam konto — zaloguj
            </button>
          ) : (
            <>
              <button type="button" className="nb-codebar-link" onClick={() => go('register')}>
                załóż konto
              </button>
              <button type="button" className="nb-codebar-link" onClick={() => go('forgot')}>
                nie pamiętam hasła
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
}
