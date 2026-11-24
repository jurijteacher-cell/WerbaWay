'use client';

import { useEffect, useRef, useState } from 'react';
import type { BookPage } from '@/lib/pages/pages';
import { useT } from '@/i18n/client';
import { getAccessToken } from '@/lib/embed-auth';
import { MAX_PHOTOS, composeAnswer } from '@/lib/answer-photos';
import { uploadPhoto, type UploadedPhoto } from '@/lib/image-shrink';

/** сторінка тексту, де учня просять щось написати («Napisz…», «Opisz…») — під нею потрібне місце для відповіді */
const WRITE_RE = /\b(napisz|opisz|zapisz|wypisz|ułóż|przepisz|odpowiedz\s+na\s+pytani\w*|uzupełnij\s+w\s+zeszycie)/i;

export function needsWriting(page: BookPage): boolean {
  if (page.kind !== 'text') return false;
  return page.blocks.some((b) => b.k === 'html' && WRITE_RE.test(b.html.replace(/<[^>]+>/g, ' ')));
}

type Draft = { text: string; photos: UploadedPhoto[]; sent: string | null };
const EMPTY: Draft = { text: '', photos: [], sent: null };

/**
 * Письмова відповідь прямо в лекції: текст і/або фото зошита → викладачеві.
 * Чернетка живе в localStorage цього пристрою; надіслане лягає в embed_attempts (embed=lecture) —
 * викладач бачить його в «Усі відповіді у вправах» разом із фото.
 */
export function WrittenAnswer({ slug, pageKey, title }: { slug: string; pageKey: string; title: string }) {
  const t = useT();
  const store = `ww_wa_v1|${slug}|${pageKey}`;
  const [d, setD] = useState<Draft>(EMPTY);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState<'photo' | 'send' | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(store);
      if (raw) setD({ ...EMPTY, ...(JSON.parse(raw) as Partial<Draft>) });
    } catch {
      /* без сховища чернетка просто не зберігається */
    }
    setReady(true);
  }, [store]);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(store, JSON.stringify(d));
    } catch {
      /* ignore */
    }
  }, [ready, store, d]);

  const composed = composeAnswer(d.text, d.photos.map((x) => x.p));
  const sent = d.sent !== null && d.sent === composed;

  async function addPhotos(files: FileList | null) {
    if (!files?.length) return;
    setErr(null);
    setBusy('photo');
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('auth');
      const next = [...d.photos];
      for (const f of Array.from(files)) {
        if (next.length >= MAX_PHOTOS) break;
        next.push(await uploadPhoto(f, token));
      }
      setD((x) => ({ ...x, photos: next }));
    } catch {
      setErr(t('Не вдалося завантажити фото. Спробуй ще раз.'));
    } finally {
      setBusy(null);
      if (file.current) file.current.value = '';
    }
  }

  async function send() {
    if (!composed) return;
    setErr(null);
    setBusy('send');
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('auth');
      const r = await fetch('/api/embed/attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          token,
          attempts: [
            { lessonId: slug, embed: 'lecture', blockId: pageKey, itemId: `lec:${pageKey}`, itemType: 'writing', prompt: title, answer: composed, correct: null },
          ],
        }),
      });
      if (!r.ok) throw new Error(String(r.status));
      setD((x) => ({ ...x, sent: composed }));
    } catch {
      setErr(t('Не вдалося надіслати. Перевір інтернет і спробуй ще раз.'));
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="lp-write" aria-label={t('Письмова відповідь')} data-sent={sent || undefined}>
      <header className="lp-write-head">
        <b>{t('Письмова відповідь')}</b>
        <span>{t('Напиши тут або додай фото зошита — викладач побачить.')}</span>
      </header>
      <textarea
        className="ww-input lp-write-text"
        rows={5}
        value={d.text}
        onChange={(e) => setD((x) => ({ ...x, text: e.target.value }))}
        placeholder={t('Твоя відповідь…')}
        data-role="written-answer"
      />
      <div className="lp-write-row">
        <input ref={file} type="file" accept="image/*" multiple hidden onChange={(e) => void addPhotos(e.target.files)} />
        <button
          type="button"
          className="ww-btn ww-btn-secondary ww-btn-sm"
          disabled={busy !== null || d.photos.length >= MAX_PHOTOS}
          onClick={() => file.current?.click()}
        >
          {busy === 'photo' ? t('Завантажую…') : t('📷 Додати фото')}
        </button>
        {d.photos.map((x, i) => (
          <span key={x.p} className="lp-write-thumb">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={x.th} alt={t('Фото {n}', { n: i + 1 })} />
            <button
              type="button"
              aria-label={t('Прибрати фото')}
              onClick={() => setD((y) => ({ ...y, photos: y.photos.filter((z) => z.p !== x.p) }))}
            >
              ×
            </button>
          </span>
        ))}
        <span className="lp-write-spacer" />
        <button type="button" className="ww-btn ww-btn-primary ww-btn-sm" disabled={!composed || sent || busy !== null} onClick={() => void send()}>
          {busy === 'send' ? t('Надсилаю…') : sent ? t('✓ Надіслано') : t('Надіслати викладачеві')}
        </button>
      </div>
      {sent && <p className="lp-write-note">{t('Можна виправити й надіслати ще раз.')}</p>}
      {err && <p className="lp-donebar-err">{err}</p>}
    </section>
  );
}
