'use client';

/**
 * Account state for embeds (Notion iframes): e-mail + password login, sign-up,
 * password reset. One external store shared by the account bar, the tracker and the mock exam.
 *
 * Old student codes: if this browser still has `ww_student_code`, the first login moves
 * that code's history onto the account (embed_claim_code) and forgets the code.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { embedSupabase } from '@/lib/supabase/embed-client';
import { createClient as createSiteClient } from '@/lib/supabase/client';

/**
 * Два режими:
 * - site: вправа відкрита на werbaway.com (лекція, клас, домашка, або всередині них) і учень уже увійшов на сайт —
 *   використовуємо ту саму сесію сайту (cookie). Окремий вхід не потрібен, результати пишуться в його акаунт.
 * - embed: вправа в Notion (сторонній сайт) — власний вхід, сесія в localStorage, як і раніше.
 */
let active: SupabaseClient | null = null;
const sb = () => active ?? embedSupabase();

/** вправа на нашому сайті: верхнє вікно або батьківська сторінка того ж походження */
function onSite(): boolean {
  try {
    return window.parent === window || window.parent.location.origin === window.location.origin;
  } catch {
    return false; // батько — інший сайт (Notion)
  }
}

export type AuthState = {
  /** false until the stored session has been read */
  ready: boolean;
  userId: string | null;
  email: string | null;
  /** display name from the profile */
  name: string | null;
  role: 'student' | 'teacher' | null;
  busy: boolean;
  error: string | null;
  info: string | null;
  /** site — вхід через сайт (кнопки «вийти» у вправі немає), embed — власний вхід вправи */
  mode: 'site' | 'embed';
};

const LEGACY_CODE = 'ww_student_code';
const LEGACY_NAME = 'ww_student_name';

let state: AuthState = {
  ready: false,
  userId: null,
  email: null,
  name: null,
  role: null,
  busy: false,
  error: null,
  info: null,
  mode: 'embed',
};
const serverState = state;
const listeners = new Set<() => void>();
let started = false;

function emit(patch: Partial<AuthState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

/** Account id remembered for embed-progress.ts (exercise progress is stored per account). */
const UID_KEY = 'ww_embed_uid';

function ls(op: 'get' | 'del' | 'set', k: string, v?: string): string | null {
  try {
    if (op === 'get') return window.localStorage.getItem(k);
    if (op === 'set') window.localStorage.setItem(k, v ?? '');
    else window.localStorage.removeItem(k);
  } catch {
    /* storage blocked */
  }
  return null;
}

const MESSAGES: Record<string, string> = {
  'Invalid login credentials': 'Zły e-mail lub hasło. / Невірний e-mail або пароль.',
  'Email not confirmed': 'Najpierw potwierdź e-mail — link jest w liście. / Спочатку підтверди пошту — посилання в листі.',
  'User already registered': 'To konto już istnieje — zaloguj się. / Акаунт уже існує — увійди.',
};

function human(msg: string | undefined) {
  if (!msg) return 'Błąd. Spróbuj jeszcze raz. / Помилка, спробуй ще раз.';
  if (/email rate limit/i.test(msg)) return 'Limit wysyłki e-maili wyczerpany — spróbuj za godzinę lub napisz do nauczyciela. / Ліміт листів вичерпано — спробуй за годину або напиши викладачу.';
  if (/rate limit|too many/i.test(msg)) return 'Za dużo prób. Spróbuj za kilka minut. / Забагато спроб, спробуй за кілька хвилин.';
  if (/password should be at least/i.test(msg)) return 'Hasło: minimum 8 znaków. / Пароль: мінімум 8 символів.';
  return MESSAGES[msg] ?? 'Nie udało się. Spróbuj jeszcze raz. / Не вийшло, спробуй ще раз.';
}

async function loadProfile(userId: string, email: string | null) {
  const client = sb();
  // creates the student row on first use and tells the display name
  const me = await client.rpc('embed_me');
  const row = Array.isArray(me.data) ? me.data[0] : null;
  const prof = await client.from('profiles').select('role, full_name').eq('id', userId).maybeSingle();
  ls('set', UID_KEY, userId);
  emit({
    userId,
    email,
    name: row?.name ?? prof.data?.full_name ?? email?.split('@')[0] ?? null,
    role: (prof.data?.role as AuthState['role']) ?? 'student',
  });
}

/** Moves the history of a legacy code onto the account (once). */
async function claimLegacyCode() {
  const code = ls('get', LEGACY_CODE);
  if (!code || code === 'NAUCZYCIEL') {
    ls('del', LEGACY_CODE);
    ls('del', LEGACY_NAME);
    return;
  }
  const { data, error } = await sb().rpc('embed_claim_code', { p_code: code });
  if (error) return; // try again next time
  ls('del', LEGACY_CODE);
  ls('del', LEGACY_NAME);
  if (data === 'ok') emit({ info: 'Twoja historia z kodu została przeniesiona na konto. / Історію з коду перенесено на акаунт.' });
  else if (data === 'taken') emit({ info: 'Ten kod należy już do innego konta. / Цей код уже належить іншому акаунту.' });
}

function start() {
  if (started || typeof window === 'undefined') return;
  started = true;
  void (async () => {
    if (onSite()) {
      try {
        const site = createSiteClient();
        const { data } = await site.auth.getSession();
        const u = data.session?.user;
        if (u) {
          active = site;
          emit({ mode: 'site' });
          await loadProfile(u.id, u.email ?? null);
          void claimLegacyCode();
          emit({ ready: true });
          site.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_OUT') {
              ls('del', UID_KEY);
              emit({ userId: null, email: null, name: null, role: null });
            }
          });
          return;
        }
      } catch {
        /* немає сесії сайту — звичайний вхід вправи */
      }
    }
    startEmbed();
  })();
}

function startEmbed() {
  const embed = embedSupabase();
  void embed.auth.getSession().then(async ({ data }) => {
    const u = data.session?.user;
    if (u) {
      await loadProfile(u.id, u.email ?? null);
      void claimLegacyCode().then(() => loadProfile(u.id, u.email ?? null));
    }
    emit({ ready: true });
  });
  embed.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
      ls('del', UID_KEY);
      emit({ userId: null, email: null, name: null, role: null });
    } else if (event === 'SIGNED_IN' && session?.user && session.user.id !== state.userId) {
      const u = session.user;
      // defer: supabase-js forbids awaiting its own calls inside this callback
      setTimeout(async () => {
        await loadProfile(u.id, u.email ?? null);
        await claimLegacyCode();
        await loadProfile(u.id, u.email ?? null);
      }, 0);
    }
  });
}

export function subscribe(l: () => void) {
  start();
  listeners.add(l);
  return () => listeners.delete(l);
}
export function getState() {
  start();
  return state;
}
export function getServerState() {
  return serverState;
}

/** Fresh access token for API calls (refreshes when expired), or null. */
export async function getAccessToken(): Promise<string | null> {
  const { data } = await sb().auth.getSession();
  return data.session?.access_token ?? null;
}

export async function signIn(email: string, password: string): Promise<boolean> {
  emit({ busy: true, error: null, info: null });
  const { error } = await sb().auth.signInWithPassword({ email: email.trim(), password });
  emit({ busy: false, error: error ? human(error.message) : null });
  return !error;
}

export async function signUp(input: { email: string; password: string; firstName: string; lastName: string }) {
  emit({ busy: true, error: null, info: null });
  const sb = embedSupabase();
  const { data, error } = await sb.auth.signUp({
    email: input.email.trim(),
    password: input.password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/confirmed`,
      data: { first_name: input.firstName.trim(), last_name: input.lastName.trim() },
    },
  });
  if (error) {
    emit({ busy: false, error: human(error.message) });
    return 'error' as const;
  }
  // existing e-mail with confirmation on: Supabase returns a user with no identities
  if (data.user && data.user.identities && data.user.identities.length === 0) {
    emit({ busy: false, error: human('User already registered') });
    return 'error' as const;
  }
  emit({ busy: false });
  return data.session ? ('signed-in' as const) : ('confirm-mail' as const);
}

export async function requestPasswordReset(email: string): Promise<boolean> {
  emit({ busy: true, error: null, info: null });
  const { error } = await sb().auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${window.location.origin}/auth/confirm?next=/reset-password`,
  });
  emit({ busy: false, error: error ? human(error.message) : null });
  return !error;
}

export async function signOut() {
  // у режимі сайту виходять через меню сайту, а не з вправи
  if (state.mode === 'site') return;
  await embedSupabase().auth.signOut();
}

export function clearMessages() {
  emit({ error: null, info: null });
}
