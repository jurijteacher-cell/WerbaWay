'use client';

import { useRef, useState } from 'react';
import { Camera, Check, Send, X } from 'lucide-react';
import { trackAttempt, type AttemptInput } from '@/lib/embed-tracker';
import { getAccessToken } from '@/lib/embed-auth';
import { usePersistentState } from '@/lib/embed-progress';
import { MAX_PHOTOS, composeAnswer } from '@/lib/answer-photos';
import { uploadPhoto, type UploadedPhoto } from '@/lib/image-shrink';

type Props = {
  text: string;
  /** Free writing has no key: recorded with correct = null for the teacher to read */
  attempt: Omit<AttemptInput, 'answer' | 'correct'>;
};

type Photo = UploadedPhoto;

/**
 * «Wyślij nauczycielowi» під письмовими завданнями: текст + до 4 фото (зошит, рукописний текст).
 * Embed-only: nb-* classes.
 */
export function SendToTeacher({ text, attempt }: Props) {
  const [sentText, setSentText] = useState<string | null>(null);
  const ph = usePersistentState<{ photos: Photo[] }>(`photos:${attempt.blockId ?? ''}:${attempt.itemId}`, { photos: [] });
  const photos = ph.value.photos;
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const trimmed = text.trim();
  const composed = composeAnswer(trimmed, photos.map((x) => x.p));
  const sent = sentText !== null && sentText === composed;

  async function add(files: FileList | null) {
    if (!files?.length) return;
    setErr(null);
    setBusy(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('auth');
      const next = [...photos];
      for (const f of Array.from(files)) {
        if (next.length >= MAX_PHOTOS) break;
        next.push(await uploadPhoto(f, token));
      }
      ph.setValue({ photos: next });
    } catch (e) {
      setErr(
        e instanceof Error && e.message === 'auth'
          ? 'Zaloguj się, aby dodać zdjęcie. / Увійди, щоб додати фото.'
          : 'Nie udało się wysłać zdjęcia. Spróbuj jeszcze raz. / Не вдалося завантажити фото. Спробуй ще раз.'
      );
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }

  return (
    <div>
      <div className="nb-row" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          ref={input}
          type="file"
          accept="image/*"
          multiple
          hidden
          data-role="photo-input"
          onChange={(e) => void add(e.target.files)}
        />
        <button
          type="button"
          className="nb-btn ghost"
          data-role="add-photo"
          disabled={busy || photos.length >= MAX_PHOTOS}
          onClick={() => input.current?.click()}
        >
          <Camera aria-hidden /> {busy ? 'Wysyłam…' : 'Dodaj zdjęcie'}
        </button>
        {photos.map((x, i) => (
          <span key={x.p} style={{ position: 'relative', display: 'inline-block' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={x.th} alt={`Zdjęcie ${i + 1}`} style={{ height: 44, width: 'auto', borderRadius: 8, display: 'block' }} />
            <button
              type="button"
              aria-label="Usuń zdjęcie"
              className="nb-btn ghost"
              style={{ position: 'absolute', top: -8, right: -8, padding: 2, minHeight: 0, borderRadius: 999 }}
              onClick={() => ph.setValue({ photos: photos.filter((y) => y.p !== x.p) })}
            >
              <X aria-hidden size={12} />
            </button>
          </span>
        ))}
      </div>
      <p className="nb-note" style={{ margin: '4px 0 8px' }}>
        Możesz napisać tekst i/lub dodać zdjęcie zeszytu (do {MAX_PHOTOS}). / Можна написати текст і/або додати фото зошита (до {MAX_PHOTOS}).
      </p>
      {err ? <p className="nb-note" style={{ color: 'var(--nb-no)' }}>{err}</p> : null}
      <div className="nb-row">
        <button
          type="button"
          className={`nb-btn${sent ? ' success' : ''}`}
          disabled={!composed || sent || busy}
          onClick={() => {
            trackAttempt({ ...attempt, answer: composed, correct: null });
            setSentText(composed);
          }}
        >
          {sent ? (
            <>
              <Check aria-hidden /> Wysłane
            </>
          ) : (
            <>
              <Send aria-hidden /> Wyślij nauczycielowi
            </>
          )}
        </button>
        {sent ? <span className="nb-note" style={{ margin: 0 }}>Możesz poprawić i wysłać jeszcze raz.</span> : null}
      </div>
    </div>
  );
}
