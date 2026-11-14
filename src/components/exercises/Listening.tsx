'use client';

import { useT } from '@/i18n/client';
import { MultipleChoice } from './MultipleChoice';

type Props = {
  audioUrl: string;
  options: string[];
  value: number | null;
  onChange: (index: number) => void;
  disabled?: boolean;
};

export function Listening({ audioUrl, options, value, onChange, disabled }: Props) {
  const t = useT();
  return (
    <div className="flex flex-col gap-4">
      <audio controls src={audioUrl} className="w-full">
        {t("Твій браузер не підтримує аудіо-плеєр.")}
      </audio>
      <MultipleChoice options={options} value={value} onChange={onChange} disabled={disabled} />
    </div>
  );
}
