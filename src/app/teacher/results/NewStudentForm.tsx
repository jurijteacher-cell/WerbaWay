'use client';

import { useRef, useState, useTransition } from 'react';
import { createStudent } from './actions';

export function NewStudentForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ code?: string; error?: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const message = (code: string) =>
    `Twój kod do ćwiczeń: ${code}\nWpisz go raz w polu «Twój kod» nad ćwiczeniami — wtedy widzę Twoje wyniki.`;

  return (
    <div className="rounded-xl border border-ink-line bg-ink-raised p-5">
      <form
        ref={formRef}
        className="flex flex-wrap items-end gap-3"
        action={(fd) =>
          start(async () => {
            setCopied(false);
            const r = await createStudent(fd);
            if (r.ok) {
              setResult({ code: r.code });
              formRef.current?.reset();
            } else setResult({ error: r.error });
          })
        }
      >
        <label className="flex flex-col gap-1 text-sm text-paper-muted">
          Ім’я учня
          <input
            name="name"
            required
            maxLength={80}
            placeholder="Anna"
            className="w-48 rounded-lg border border-ink-line bg-ink px-3 py-2 text-paper"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-paper-muted">
          Примітка (необов’язково)
          <input
            name="note"
            maxLength={200}
            placeholder="B1, telc, Preply"
            className="w-64 rounded-lg border border-ink-line bg-ink px-3 py-2 text-paper"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-gold px-4 py-2 text-sm font-medium text-ink hover:bg-gold-bright disabled:opacity-50"
        >
          {pending ? 'Створюю…' : 'Створити код'}
        </button>
      </form>

      {result?.error && <p className="mt-3 text-sm text-incorrect">{result.error}</p>}
      {result?.code && (
        <div className="mt-4 rounded-lg border border-gold/40 p-4">
          <p className="text-sm text-paper-muted">Код учня:</p>
          <p className="font-mono text-2xl tracking-widest text-gold">{result.code}</p>
          <pre className="mt-3 whitespace-pre-wrap rounded bg-ink p-3 text-sm text-paper">{message(result.code)}</pre>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(message(result.code!)).then(() => setCopied(true));
            }}
            className="mt-2 rounded-lg border border-gold/40 px-3 py-1.5 text-sm text-gold hover:bg-gold/10"
          >
            {copied ? '✓ Скопійовано' : 'Скопіювати повідомлення для учня'}
          </button>
          <p className="mt-3 text-xs text-paper-muted">
            Для персональної сторінки учня можна дописати код у посилання ембеда: <code>…/hw?s={result.code}</code> — тоді
            вводити нічого не треба.
          </p>
        </div>
      )}
    </div>
  );
}
