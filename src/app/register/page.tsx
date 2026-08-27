'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
  };

  if (done) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 text-center">
        <div>
          <h1 className="mb-2 font-display text-2xl text-paper">Перевір пошту</h1>
          <p className="text-paper-muted">Ми надіслали лист для підтвердження акаунта.</p>
          <Link href="/login" className="mt-6 inline-block text-gold hover:text-gold-bright">
            До входу
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 font-display text-3xl text-paper">Реєстрація</h1>
        <p className="mb-8 text-paper-muted">Створи акаунт учня Werba Way</p>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            required
            placeholder="Імʼя"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="rounded-lg border border-ink-line bg-ink-raised px-4 py-3 text-paper placeholder:text-paper-muted outline-none focus:border-gold"
          />
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
            minLength={6}
            placeholder="Пароль (мінімум 6 символів)"
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
            {loading ? 'Створюю…' : 'Зареєструватись'}
          </button>
        </form>

        <p className="mt-6 text-sm text-paper-muted">
          Вже маєш акаунт?{' '}
          <Link href="/login" className="text-gold hover:text-gold-bright">
            Увійти
          </Link>
        </p>
      </div>
    </main>
  );
}
