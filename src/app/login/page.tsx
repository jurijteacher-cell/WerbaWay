'use client';


import { useT } from '@/i18n/client';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { safeNext } from '@/lib/safe-next';
import { AuthShell, buttonClass, humanAuthError, inputClass } from '@/components/auth/AuthShell';
import { GoogleButton, OrDivider } from '@/components/auth/GoogleButton';
import { LegalLinks } from '@/components/auth/LegalLinks';

function LoginForm() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const reset = searchParams.get('reset') === '1';
  const googleFailed = searchParams.get('error') === 'google';

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setLoading(false);
      setError(t(humanAuthError(error.message)));
      return;
    }
    router.push(safeNext(searchParams.get('next')));
    router.refresh();
  };

  return (
    <AuthShell logo title="Werba Way" lead={t("Увійди, щоб продовжити навчання")}>
      {reset ? <p className="mb-4 text-sm text-correct">{t("Пароль змінено. Увійди з новим паролем.")}</p> : null}
      {googleFailed ? <p className="mb-4 text-sm text-incorrect">{t("Не вдалося увійти через Google. Спробуй ще раз або увійди поштою")}</p> : null}
      <GoogleButton next={searchParams.get('next')} />
      <OrDivider />
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="ww-field">
          <span>Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="ww-field">
          <span>{t("Пароль")}</span>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
        </label>
        {error && <p className="text-sm text-incorrect">{error}</p>}
        <button type="submit" disabled={loading} className={buttonClass}>
          {loading ? t("Входжу…") : t("Увійти")}
        </button>
      </form>

      <p className="mt-4 text-sm">
        <Link href="/forgot-password" className="text-paper-muted hover:text-gold">
          {t("Забув(ла) пароль?")}
        </Link>
      </p>
      <p className="mt-3 text-sm text-paper-muted">
        {t("Немає акаунта?")}{' '}
        <Link href="/register" className="text-gold hover:text-gold-bright">
          {t("Зареєструватись")}
        </Link>
      </p>
      <LegalLinks />
    </AuthShell>
  );
}

export default function LoginPage() {
  const t = useT();
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center px-4">
          <p className="text-paper-muted">{t("Завантаження…")}</p>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
