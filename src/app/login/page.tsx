'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError('Невірний email або пароль');
      return;
    }
    router.push(searchParams.get('next') ?? '/');
    router.refresh();
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 font-display text-3xl text-paper">Werba Way</h1>
        <p className="mb-8 text-paper-muted">Увійди, щоб продовжити навчання</p>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-ink-line bg-ink-raised px-4 py-3 text-paper placeholder:text-paper-muted outline-none focus:border-gold"
          />
          <input
            type="password"
            required
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border border-ink-line bg-ink-raised px-4 py-3 text-paper placeholder:text-paper-muted outline-none focus:border-gold"
          />
          {error && <p className="text-sm text-incorrect">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-gold px-5 py-3 font-medium text-ink transition-colors hover:bg-gold-bright disabled:opacity-50"
          >
            {loading ? 'Входжу…' : 'Увійти'}
          </button>
        </form>

        <p className="mt-6 text-sm text-paper-muted">
          Немає акаунта?{' '}
          <Link href="/register" className="text-gold hover:text-gold-bright">
            Зареєструватись
          </Link>
        </p>
      </div>
    </main>
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
