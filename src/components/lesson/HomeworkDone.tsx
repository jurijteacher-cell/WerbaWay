'use client';

import { useState } from 'react';

export function HomeworkDone({ slug, assigned, done }: { slug: string; assigned: boolean; done: boolean }) {
  const [isDone, setDone] = useState(done);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function mark() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/learn/hw-done', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || String(res.status));
      setDone(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Помилка');
    } finally {
      setBusy(false);
    }
  }

  if (!assigned) {
    return <div className="lp-hwdone">Цю домашку ще не задано: вона з’явиться, коли викладач завершить лекцію.</div>;
  }
  return (
    <div className="lp-hwdone">
      <span>{isDone ? '✅ Домашку здано' : 'Зробив(ла) усе? Познач, щоб викладач побачив.'}</span>
      {!isDone && (
        <button type="button" className="ww-btn ww-btn-primary" onClick={mark} disabled={busy}>
          {busy ? '…' : 'Домашку виконано'}
        </button>
      )}
      {err && <span className="text-incorrect">{err}</span>}
    </div>
  );
}
