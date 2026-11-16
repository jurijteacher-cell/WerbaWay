'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useT } from '@/i18n/client';
import { createClient } from '@/lib/supabase/client';
import { safeNext } from '@/lib/safe-next';

/**
 * «Увійти через Google» — однаково для входу й реєстрації: якщо акаунта з цією поштою ще немає,
 * Supabase його створить (роль — учень), якщо є — прив'яже Google до наявного.
 * Повертаємось на /auth/callback, яке міняє код на сесію й веде на `next`.
 */
const GOOGLE_G = 'https://developers.google.com/static/identity/images/g-logo.png';

export function GoogleButton({ next, label }: { next?: string | null; label?: string }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setBusy(true);
    setError(null);
    const target = safeNext(next ?? null);
    const { error } = await createClient().auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(target)}`,
        // щоб Google щоразу давав вибрати акаунт, а не входив мовчки в перший-ліпший
        queryParams: { prompt: 'select_account' },
      },
    });
    // при успіху браузер уже йде на Google; сюди доходимо лише з помилкою
    if (error) {
      setBusy(false);
      setError(t("Вхід через Google зараз недоступний. Увійди поштою й паролем"));
    }
  }

  return (
    <div>
      <button type="button" onClick={go} disabled={busy} className="ww-btn ww-btn-secondary ww-btn-lg w-full gap-3">
        {/* офіційний значок Google з їхніх правил оформлення кнопки (developers.google.com/identity/branding-guidelines) */}
        <Image src={GOOGLE_G} alt="" width={20} height={20} className="h-5 w-5 flex-none object-contain" aria-hidden="true" />
        <span>{busy ? t("Переходжу до Google…") : label ?? t("Увійти через Google")}</span>
      </button>
      {error && <p className="mt-2 text-sm text-incorrect">{error}</p>}
    </div>
  );
}

/** Розділювач «або» між Google і формою */
export function OrDivider() {
  const t = useT();
  return (
    <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wider text-paper-muted" aria-hidden="true">
      <span className="h-px flex-1 bg-current opacity-30" />
      {t("або")}
      <span className="h-px flex-1 bg-current opacity-30" />
    </div>
  );
}
