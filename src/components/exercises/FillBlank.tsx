'use client';

type Props = {
  textWithBlank: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export function FillBlank({ textWithBlank, value, onChange, disabled }: Props) {
  const [before, after] = textWithBlank.split('___');

  return (
    <p className="text-lg leading-relaxed text-paper/90">
      {before}
      <input
        type="text"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="mx-1 w-40 border-b-2 border-gold bg-transparent px-1 text-center text-gold-bright outline-none disabled:opacity-60"
      />
      {after}
    </p>
  );
}
