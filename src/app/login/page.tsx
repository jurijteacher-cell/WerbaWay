'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { safeNext } from '@/lib/safe-next';
import { AuthShell, buttonClass, humanAuthError, inputClass } from '@/components/auth/AuthShell';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const reset = searchParams.get('reset') === '1';

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setLoading(false);
      setError(humanAuthError(error.message));
      return;
    }
    router.push(safeNext(searchParams.get('next')));
    router.refresh();
  };

  return (
    <AuthShell title="Werba Way" lead="Увійди, щоб продовжити навчання">
      {reset ? <p className="mb-4 text-sm text-correct">Пароль змінено. Увійди з новим паролем.</p> : null}
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <input
          type="email"
          required
          autoComplete="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
        <input
          type="password"
          required
          autoComplete="current-password"
          placeholder="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
        />
        {error && <p className="text-sm text-incorrect">{error}</p>}
        <button type="submit" disabled={loading} className={buttonClass}>
          {loading ? 'Входжу…' : 'Увійти'}
        </button>
      </form>

      <p className="mt-4 text-sm">
        <Link href="/forgot-password" className="text-paper-muted hover:text-gold">
          Забув(ла) пароль?
        </Link>
      </p>
      <p className="mt-3 text-sm text-paper-muted">
        Немає акаунта?{' '}
        <Link href="/register" className="text-gold hover:text-gold-bright">
          Зареєструватись
        </Link>
      </p>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center px-4">
          <p className="text-paper-muted">Завантаження…</p>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
