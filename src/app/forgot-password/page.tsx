'use client';


import { useT } from '@/i18n/client';
import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { AuthShell, buttonClass, humanAuthError, inputClass } from '@/components/auth/AuthShell';

export default function ForgotPasswordPage() {
  const t = useT();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await createClient().auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/confirm?next=/reset-password`,
    });
    setLoading(false);
    if (error) return setError(t(humanAuthError(error.message)));
    setSent(true);
  };

  return (
    <AuthShell title={t("Скидання пароля")} lead={t("Вкажи email — надішлемо посилання для нового пароля")}>
      {sent ? (
        <p className="text-paper-muted">
          Якщо акаунт із адресою <span className="text-paper">{email}</span> {t("існує, лист уже в дорозі. Посилання\n          діє обмежений час. Перевір і «Спам».")}
        </p>
      ) : (
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
          {error && <p className="text-sm text-incorrect">{error}</p>}
          <button type="submit" disabled={loading} className={buttonClass}>
            {loading ? t("Надсилаю…") : t("Надіслати посилання")}
          </button>
        </form>
      )}
      <p className="mt-6 text-sm">
        <Link href="/login" className="text-gold hover:text-gold-bright">
          ← До входу
        </Link>
      </p>
    </AuthShell>
  );
}
