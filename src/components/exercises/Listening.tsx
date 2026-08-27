'use client';

import { MultipleChoice } from './MultipleChoice';

type Props = {
  audioUrl: string;
  options: string[];
  value: number | null;
  onChange: (index: number) => void;
  disabled?: boolean;
};

export function Listening({ audioUrl, options, value, onChange, disabled }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <audio controls src={audioUrl} className="w-full">
        Твій браузер не підтримує аудіо-плеєр.
      </audio>
      <MultipleChoice options={options} value={value} onChange={onChange} disabled={disabled} />
    </div>
  );
}
