'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '@/i18n/client';
import { createClient } from '@/lib/supabase/client';

type Lesson = { slug: string; title: string };

/**
 * «Пройдено, задати домашку»: лекція йде в історію учня (lesson_progress) — так вона лишається
 * йому відкритою, — і, якщо в уроці є домашка, домашка задається. Раніше це робила кнопка
 * «Завершити лекцію» в класі. Скасувати з інтерфейсу не можна, тому — у два кліки.
 */
export function MarkLessonDone({ studentId, lessons, compact }: { studentId: string; lessons: Lesson[]; compact?: boolean }) {
  const t = useT();
  const router = useRouter();
  const [slug, setSlug] = useState(lessons[0]?.slug ?? '');
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!lessons.some((l) => l.slug === slug)) setSlug(lessons[0]?.slug ?? '');
  }, [lessons, slug]);

  useEffect(() => {
    if (!confirm) return;
    const id = setTimeout(() => setConfirm(false), 4000);
    return () => clearTimeout(id);
  }, [confirm]);

  async function run() {
    if (!slug || busy) return;
    if (!confirm) {
      setConfirm(true);
      return;
    }
    setConfirm(false);
    setBusy(true);
    setMsg(null);
    try {
      const info = (await fetch(`/api/learn/steps?slug=${encodeURIComponent(slug)}`).then((r) => (r.ok ? r.json() : null))) as {
        hasHomework?: boolean;
      } | null;
      const hasHomework = !!info?.hasHomework;
      const supabase = createClient();
      const { data: prev } = await supabase
        .from('lesson_progress')
        .select('homework_assigned_at')
        .eq('student_id', studentId)
        .eq('lesson_slug', slug)
        .maybeSingle();
      const now = new Date().toISOString();
      const { error } = await supabase.from('lesson_progress').upsert({
        student_id: studentId,
        lesson_slug: slug,
        completed_at: now,
        completed_via: 'teacher',
        homework_assigned_at: prev?.homework_assigned_at ?? (hasHomework ? now : null),
      });
      if (error) throw new Error(error.message);
      setMsg({ ok: true, text: hasHomework ? t("Лекцію пройдено, домашку задано.") : t("Лекцію пройдено (домашки в цьому уроці немає).") });
      router.refresh();
    } catch (e) {
      setMsg({ ok: false, text: `${t("Не вдалося зберегти")}${e instanceof Error && e.message ? `: ${e.message}` : ''}` });
    } finally {
      setBusy(false);
    }
  }

  if (!lessons.length) return null;
  return (
    <div className={compact ? 'flex flex-wrap items-center gap-2' : 'flex flex-col gap-2'}>
      <div className="flex flex-wrap items-center gap-2">
        {lessons.length > 1 && (
          <select className="ww-input max-w-full px-3 py-2" value={slug} onChange={(e) => setSlug(e.target.value)} disabled={busy}>
            {lessons.map((l) => (
              <option key={l.slug} value={l.slug}>
                {l.title}
              </option>
            ))}
          </select>
        )}
        <button type="button" className={confirm ? 'ww-btn ww-btn-primary' : 'ww-btn ww-btn-secondary'} onClick={run} disabled={busy || !slug}>
          {busy ? t("Зберігаю…") : confirm ? t("Точно? Натисніть ще раз") : t("✓ Пройдено, задати домашку")}
        </button>
      </div>
      {msg && <p className={`text-sm ${msg.ok ? 'text-correct' : 'text-incorrect'}`}>{msg.text}</p>}
    </div>
  );
}
