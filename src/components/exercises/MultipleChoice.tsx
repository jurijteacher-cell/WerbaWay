'use client';

type Props = {
  options: string[];
  value: number | null;
  onChange: (index: number) => void;
  disabled?: boolean;
};

export function MultipleChoice({ options, value, onChange, disabled }: Props) {
  return (
    <div className="flex flex-col gap-2">
      {options.map((opt, i) => (
        <button
          key={i}
          type="button"
          disabled={disabled}
          onClick={() => onChange(i)}
          className={`text-left rounded-lg border px-4 py-3 transition-colors ${
            value === i
              ? 'border-gold bg-gold/10 text-paper'
              : 'border-ink-line bg-ink-raised text-paper/90 hover:border-gold/50'
          } disabled:opacity-60 disabled:cursor-not-allowed`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
