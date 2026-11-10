'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { AuthShell, buttonClass, humanAuthError, inputClass } from '@/components/auth/AuthShell';

/** Opened from the e-mail link via /auth/confirm, which has already created a session. */
export default function ResetPasswordPage() {
  const router = useRouter();
  const [state, setState] = useState<'checking' | 'ok' | 'nosession'>('checking');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void createClient()
      .auth.getUser()
      .then(({ data }) => setState(data.user ? 'ok' : 'nosession'));
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError('Пароль має містити щонайменше 8 символів');
    if (password !== password2) return setError('Паролі не збігаються');
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setLoading(false);
      return setError(humanAuthError(error.message));
    }
    await supabase.auth.signOut();
    router.push('/login?reset=1');
  };

  if (state === 'checking') {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <p className="text-paper-muted">Завантаження…</p>
      </main>
    );
  }

  if (state === 'nosession') {
    return (
      <AuthShell title="Посилання не діє">
        <p className="text-paper-muted">Посилання застаріло або вже використане. Запроси нове.</p>
        <Link href="/forgot-password" className="mt-6 inline-block text-gold hover:text-gold-bright">
          Надіслати нове посилання
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Новий пароль" lead="Придумай пароль для входу">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <input
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="Новий пароль (мінімум 8 символів)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
        />
        <input
          type="password"
          required
          autoComplete="new-password"
          placeholder="Повтори пароль"
          value={password2}
          onChange={(e) => setPassword2(e.target.value)}
          className={inputClass}
        />
        {error && <p className="text-sm text-incorrect">{error}</p>}
        <button type="submit" disabled={loading} className={buttonClass}>
          {loading ? 'Зберігаю…' : 'Зберегти пароль'}
        </button>
      </form>
    </AuthShell>
  );
}
