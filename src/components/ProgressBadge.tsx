import { t } from '@/i18n/server';
export function ProgressBadge({ done, total }: { done: number; total: number }) {
  if (total === 0) return null;
  const complete = done >= total;
  return (
    <span
      className={`mt-2 inline-block ww-label ${
        complete ? 'text-correct' : ''
      }`}
    >
      {complete ? t("✓ Завершено") : t('Прогрес: {done} / {total}', { done, total })}
    </span>
  );
}
