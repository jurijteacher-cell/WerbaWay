'use client';


import { useT } from '@/i18n/client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { AuthShell, buttonClass, humanAuthError, inputClass } from '@/components/auth/AuthShell';

export default function RegisterPage() {
  const t = useT();
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError(t("Пароль має містити щонайменше 8 символів"));
    if (password !== password2) return setError(t("Паролі не збігаються"));
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirmed`,
        data: { first_name: firstName.trim(), last_name: lastName.trim() },
      },
    });
    setLoading(false);
    if (error) return setError(t(humanAuthError(error.message)));
    // already registered + confirmation on: Supabase returns a user without identities
    if (data.user?.identities?.length === 0) return setError(t(humanAuthError('User already registered')));
    if (data.session) {
      router.push('/dashboard');
      router.refresh();
      return;
    }
    setDone(true);
  };

  if (done) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 text-center">
        <div className="max-w-sm">
          <h1 className="mb-2 font-display text-2xl text-paper">{t("Перевір пошту")}</h1>
          <p className="text-paper-muted">
            Ми надіслали лист на <span className="text-paper">{email}</span>{t(". Натисни посилання в ньому, щоб\n            підтвердити акаунт. Якщо листа немає — зазирни у «Спам».")}
          </p>
          <Link href="/login" className="mt-6 inline-block text-gold hover:text-gold-bright">
            До входу
          </Link>
        </div>
      </main>
    );
  }

  return (
    <AuthShell title={t("Реєстрація")} lead={t("Створи акаунт у Werba Way")}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            required
            autoComplete="given-name"
            placeholder={t("Ім'я")}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className={inputClass}
          />
          <input
            type="text"
            required
            autoComplete="family-name"
            placeholder={t("Прізвище")}
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className={inputClass}
          />
        </div>
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
          minLength={8}
          autoComplete="new-password"
          placeholder={t("Пароль (мінімум 8 символів)")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
        />
        <input
          type="password"
          required
          autoComplete="new-password"
          placeholder={t("Повтори пароль")}
          value={password2}
          onChange={(e) => setPassword2(e.target.value)}
          className={inputClass}
        />
        {error && <p className="text-sm text-incorrect">{error}</p>}
        <button type="submit" disabled={loading} className={buttonClass}>
          {loading ? t("Створюю…") : t("Зареєструватись")}
        </button>
      </form>

      <p className="mt-6 text-sm text-paper-muted">
        Вже маєш акаунт?{' '}
        <Link href="/login" className="text-gold hover:text-gold-bright">
          Увійти
        </Link>
      </p>
    </AuthShell>
  );
}
