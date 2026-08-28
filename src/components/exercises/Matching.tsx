'use client';

type Props = {
  leftItems: { id: string; left: string }[];
  rightItems: string[];
  value: Record<string, string>;
  onChange: (leftId: string, rightValue: string) => void;
  disabled?: boolean;
};

export function Matching({ leftItems, rightItems, value, onChange, disabled }: Props) {
  return (
    <div className="flex flex-col gap-3">
      {leftItems.map((item) => (
        <div key={item.id} className="flex items-center gap-3">
          <span className="w-40 shrink-0 font-display text-paper">{item.left}</span>
          <select
            value={value[item.id] ?? ''}
            disabled={disabled}
            onChange={(e) => onChange(item.id, e.target.value)}
            className="flex-1 rounded-lg border border-ink-line bg-ink-raised px-3 py-2 text-paper/90 outline-none focus:border-gold disabled:opacity-60"
          >
            <option value="" disabled>
              Обери варіант…
            </option>
            {rightItems.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}
