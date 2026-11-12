'use client';

/**
 * Перемикач у стилі платформи: там, де раніше був системний чекбокс.
 * Вмикається кліком, пробілом або Enter; читається з клавіатури як switch.
 */
export function Switch({
  checked,
  onChange,
  label,
  hint,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={hint ?? label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="ww-switch"
    >
      <span className="ww-switch-track" aria-hidden="true">
        <span className="ww-switch-knob" />
      </span>
      <span className="ww-switch-label">{label}</span>
    </button>
  );
}
