'use client';

import { useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export type ModuleInfo = {
  code: string;
  title: string;
  lessons: { slug: string; title: string; number: number | null; level: string | null }[];
};

/** Перемикачі доступу: цілий курс або окремі лекції. Зберігається одразу. */
export function AccessEditor({
  studentId,
  modules,
  initial,
  done,
}: {
  studentId: string;
  modules: ModuleInfo[];
  initial: string[];
  done: string[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [granted, setGranted] = useState(() => new Set(initial));
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const doneSet = useMemo(() => new Set(done), [done]);

  async function toggle(kind: 'module' | 'lesson', ref: string) {
    const key = `${kind}:${ref}`;
    const on = !granted.has(key);
    setBusy(key);
    setErr(null);
    const { error } = on
      ? await supabase.from('student_access').upsert({ student_id: studentId, kind, ref })
      : await supabase.from('student_access').delete().match({ student_id: studentId, kind, ref });
    setBusy(null);
    if (error) return setErr(error.message);
    setGranted((g) => {
      const n = new Set(g);
      if (on) n.add(key);
      else n.delete(key);
      return n;
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {err && <p className="text-incorrect">Не вдалося зберегти: {err}</p>}
      {modules.map((m) => {
        const modOn = granted.has(`module:${m.code}`);
        const lessonsOn = m.lessons.filter((l) => modOn || granted.has(`lesson:${l.slug}`) || doneSet.has(l.slug)).length;
        const isOpen = open === m.code;
        return (
          <section key={m.code} className="rounded-2xl border border-ink-line bg-ink-raised">
            <div className="flex flex-wrap items-center gap-3 px-4 py-3">
              <button
                type="button"
                role="switch"
                aria-checked={modOn}
                disabled={busy === `module:${m.code}`}
                onClick={() => void toggle('module', m.code)}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${modOn ? 'bg-correct' : 'bg-ink-line'}`}
                aria-label={`Курс «${m.title}»`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${modOn ? 'translate-x-[1.35rem]' : 'translate-x-0.5'}`}
                />
              </button>
              <div className="min-w-0 flex-1">
                <p className="font-display text-lg leading-tight text-paper">{m.title}</p>
                <p className="text-sm text-paper-muted">
                  відкрито {lessonsOn} з {m.lessons.length}
                </p>
              </div>
              <button type="button" onClick={() => setOpen(isOpen ? null : m.code)} className="text-sm text-gold hover:text-gold-bright" aria-expanded={isOpen}>
                {isOpen ? 'Сховати лекції' : 'Окремі лекції'}
              </button>
            </div>
            {isOpen && (
              <ul className="border-t border-ink-line px-4 py-2">
                {m.lessons.map((l) => {
                  const key = `lesson:${l.slug}`;
                  const on = granted.has(key);
                  const passed = doneSet.has(l.slug);
                  return (
                    <li key={l.slug} className="flex items-center gap-3 py-1.5">
                      <input
                        type="checkbox"
                        checked={on || modOn || passed}
                        disabled={modOn || passed || busy === key}
                        onChange={() => void toggle('lesson', l.slug)}
                        className="h-4 w-4"
                        id={key}
                      />
                      <label htmlFor={key} className="min-w-0 flex-1 text-paper">
                        {l.title}
                      </label>
                      <span className="text-xs text-paper-muted">
                        {passed ? 'пройдено' : modOn ? 'через курс' : l.number != null ? `№ ${l.number}` : ''}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
