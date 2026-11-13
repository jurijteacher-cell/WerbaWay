'use client';

import type { ReactNode } from 'react';
import { useT } from '@/i18n/client';

export const inputClass =
  'rounded-lg border border-ink-line bg-ink-raised px-4 py-3 text-paper placeholder:text-paper-muted outline-none focus:border-gold';
export const buttonClass =
  'ww-btn ww-btn-primary ww-btn-lg w-full';

export function AuthShell({ title, lead, children }: { title: string; lead?: string; children: ReactNode }) {
  const t = useT();
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 font-display text-3xl text-paper">{title}</h1>
        {lead ? <p className="mb-8 text-paper-muted">{lead}</p> : <div className="mb-8" />}
        {children}
      </div>
    </main>
  );
}

const MESSAGES: [RegExp, string][] = [
  [/invalid login credentials/i, 'Невірний email або пароль'],
  [/email not confirmed/i, 'Спочатку підтвердь пошту — посилання в листі'],
  [/already registered|already been registered/i, 'Такий акаунт уже існує — увійди'],
  [/email rate limit/i, 'Ліміт листів вичерпано. Спробуй за годину або напиши викладачу'],
  [/rate limit|too many/i, 'Забагато спроб. Спробуй за кілька хвилин'],
  [/password should be at least/i, 'Пароль має містити щонайменше 8 символів'],
  [/same password|different from the old/i, 'Новий пароль має відрізнятися від старого'],
  [/expired|invalid.*(token|link)|otp/i, 'Посилання застаріло або вже використане. Запроси нове'],
];
/**
 * Повертає КЛЮЧ повідомлення українською — переклад робить той, хто показує:
 * це звичайна функція, а не компонент, тож хука тут немає.
 */
export function humanAuthError(msg: string | undefined): string {
  if (!msg) return 'Щось пішло не так. Спробуй ще раз';
  return MESSAGES.find(([re]) => re.test(msg))?.[1] ?? 'Не вийшло. Спробуй ще раз';
}
