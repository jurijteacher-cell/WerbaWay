'use client';

type Props = {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export function OpenText({ placeholder, value, onChange, disabled }: Props) {
  return (
    <textarea
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={4}
      className="w-full resize-none rounded-lg border border-ink-line bg-ink-raised px-4 py-3 text-paper placeholder:text-paper-muted outline-none focus:border-gold disabled:opacity-60"
    />
  );
}
