export function ProgressBadge({ done, total }: { done: number; total: number }) {
  if (total === 0) return null;
  const complete = done >= total;
  return (
    <span
      className={`mt-2 inline-block font-mono text-xs uppercase tracking-widest ${
        complete ? 'text-correct' : 'text-gold-dim'
      }`}
    >
      {complete ? '✓ Завершено' : `Прогрес: ${done} / ${total}`}
    </span>
  );
}
