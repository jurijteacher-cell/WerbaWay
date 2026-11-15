'use client';

import { useT } from '@/i18n/client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { AuthShell, buttonClass, humanAuthError, inputClass } from '@/components/auth/AuthShell';

/**
 * Кінець запрошення від викладача. Учень приходить сюди з листа через /auth/confirm (type=invite),
 * яке вже створило сесію: лишається назватися й придумати пароль.
 * /welcome?error=1 — посилання не спрацювало (застаріле або вже використане).
 */
export default function WelcomePage() {
  const t = useT();
  const router = useRouter();
  const [state, setState] = useState<'checking' | 'ok' | 'nosession' | 'failed'>('checking');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('error') === '1') {
      setState('failed');
      return;
    }
    const supabase = createClient();
    void supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return setState('nosession');
      setEmail(data.user.email ?? '');
      const { data: p } = await supabase.from('profiles').select('first_name, last_name').eq('id', data.user.id).maybeSingle();
      if (p?.first_name) setFirstName(p.first_name as string);
      if (p?.last_name) setLastName(p.last_name as string);
      setState('ok');
    });
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const first = firstName.trim();
    const last = lastName.trim();
    if (!first || !last) return setError(t("Напиши ім'я та прізвище"));
    if (password.length < 8) return setError(t("Пароль має містити щонайменше 8 символів"));
    if (password !== password2) return setError(t("Паролі не збігаються"));
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.updateUser({ password, data: { first_name: first, last_name: last } });
    if (error || !data.user) {
      setLoading(false);
      return setError(t(humanAuthError(error?.message)));
    }
    const { error: pErr } = await supabase
      .from('profiles')
      .update({ first_name: first, last_name: last, full_name: `${first} ${last}` })
      .eq('id', data.user.id);
    if (pErr) {
      setLoading(false);
      return setError(t("Пароль збережено, а ім'я — ні. Спробуй ще раз"));
    }
    router.push('/dashboard');
    router.refresh();
  };

  if (state === 'checking') {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <p className="text-paper-muted">{t("Завантаження…")}</p>
      </main>
    );
  }

  if (state !== 'ok') {
    return (
      <AuthShell title={t("Посилання не діє")}>
        <p className="text-paper-muted">
          {t("Запрошення застаріло або вже використане. Попроси викладача надіслати його ще раз. Якщо ти вже придумав(-ла) пароль — просто увійди.")}
        </p>
        <Link href="/login" className="mt-6 inline-block text-gold hover:text-gold-bright">
          {t("Увійти")}
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell logo title={t("Вітаємо у Werba Way!")} lead={t("Ще крок: напиши, як тебе звати, і придумай пароль для входу")}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {email && (
          <p className="text-sm text-paper-muted">
            {t("Твоя пошта для входу: {email}", { email })}
          </p>
        )}
        <div className="grid grid-cols-2 gap-3">
          <label className="ww-field">
            <span>{t("Ім'я")}</span>
            <input
              type="text"
              required
              autoComplete="given-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="ww-field">
            <span>{t("Прізвище")}</span>
            <input
              type="text"
              required
              autoComplete="family-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className={inputClass}
            />
          </label>
        </div>
        <label className="ww-field">
          <span>{t("Пароль (мінімум 8 символів)")}</span>
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="ww-field">
          <span>{t("Повтори пароль")}</span>
          <input
            type="password"
            required
            autoComplete="new-password"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            className={inputClass}
          />
        </label>
        {error && <p className="text-sm text-incorrect">{error}</p>}
        <button type="submit" disabled={loading} className={buttonClass}>
          {loading ? t("Зберігаю…") : t("Завершити реєстрацію")}
        </button>
      </form>
    </AuthShell>
  );
}
