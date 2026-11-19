'use client';

import { useT } from '@/i18n/client';
import { useRouter } from 'next/navigation';
import { useState, type MouseEvent } from 'react';

type Action = 'trash' | 'restore' | 'purge';

/** Один запит до /api/learn/trash; повертає текст помилки або null */
export async function trashAction(slug: string, action: Action, t: ReturnType<typeof useT>): Promise<string | null> {
  const r = await fetch('/api/learn/trash', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ slug, action }),
  }).catch(() => null);
  if (r?.ok) return null;
  const d = (await r?.json().catch(() => null)) as { error?: string } | null;
  if (d?.error === 'no_table') return t('Кошик ще не ввімкнено в базі (потрібна міграція 0017).');
  return t('Не вдалося. Спробуйте ще раз.');
}

/**
 * «У кошик» (лише викладач): лекція одразу зникає для учнів і з «Курсу»,
 * відновити або видалити назавжди — на сторінці /teacher/trash.
 */
export function TrashButton({ slug, title, compact, after }: { slug: string; title: string; compact?: boolean; after?: string }) {
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function go(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm(t('Перемістити лекцію «{title}» у кошик? Учні її більше не побачать. Відновити можна в кошику.', { title }))) return;
    setBusy(true);
    const err = await trashAction(slug, 'trash', t);
    setBusy(false);
    if (err) return window.alert(err);
    if (after) router.push(after);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={(e) => void go(e)}
      disabled={busy}
      className={compact ? 'ww-share-fab ww-trash-fab' : 'ww-btn ww-btn-danger ww-btn-sm'}
      aria-label={t('Перемістити лекцію «{title}» у кошик', { title })}
      title={t('У кошик')}
    >
      <TrashIcon />
      {!compact && <span>{busy ? '…' : t('У кошик')}</span>}
    </button>
  );
}

/** Кнопки на сторінці кошика й у банері лекції з кошика */
export function TrashRowActions({ slug, title, after }: { slug: string; title: string; after?: string }) {
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = useState<Action | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function run(action: 'restore' | 'purge') {
    if (
      action === 'purge' &&
      !window.confirm(
        t('Видалити лекцію «{title}» назавжди? Її сторінку, вправи, переклади й картинки буде прибрано з сайту. Скасувати це не можна.', { title })
      )
    )
      return;
    setBusy(action);
    setErr(null);
    const e = await trashAction(slug, action, t);
    setBusy(null);
    if (e) return setErr(e);
    if (after) router.push(after);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" disabled={!!busy} onClick={() => void run('restore')} className="ww-btn ww-btn-secondary ww-btn-sm">
        {busy === 'restore' ? '…' : t('Відновити')}
      </button>
      <button type="button" disabled={!!busy} onClick={() => void run('purge')} className="ww-btn ww-btn-danger ww-btn-sm">
        {busy === 'purge' ? '…' : t('Видалити назавжди')}
      </button>
      {err && <span className="text-sm text-incorrect">{err}</span>}
    </div>
  );
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" />
    </svg>
  );
}
