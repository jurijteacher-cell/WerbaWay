'use client';

/**
 * Shared building blocks of the exercise UI v2 (embed-only: nb-* classes / --nb-* vars).
 * See docs/STYLE_NOTEBOOK.md «UI v2».
 */
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import {
  ArrowRight,
  Check,
  CornerDownLeft,
  History,
  Lightbulb,
  MousePointerClick,
  PartyPopper,
  RotateCcw,
  X,
} from 'lucide-react';
import { normalizeAnswer, stripDiacritics } from '@/lib/answer-match';

/* ── feedback line under an item ───────────────────────────────────────────── */
export function Feedback({
  kind,
  children,
  action,
}: {
  kind: 'ok' | 'no' | 'hint' | 'info';
  children: ReactNode;
  action?: ReactNode;
}) {
  const Icon = kind === 'ok' ? Check : kind === 'no' ? X : Lightbulb;
  return (
    <div className={`nb-fb ${kind}`} role={kind === 'no' ? 'alert' : 'status'} data-role="explanation">
      <Icon aria-hidden strokeWidth={2.4} />
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
      {action}
    </div>
  );
}

/* ── progress bar ──────────────────────────────────────────────────────────── */
export function Progress({ done, total, label = 'poprawnie' }: { done: number; total: number; label?: string }) {
  if (!total) return null;
  const pct = Math.round((done / total) * 100);
  return (
    <div className="nb-progress" aria-label={`${done} / ${total} ${label}`}>
      <div className="nb-progress-track">
        <div className="nb-progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <span>
        <b>{done}</b> / {total} {label}
      </span>
    </div>
  );
}

/* ── «level complete» banner with a small confetti burst ──────────────────── */
const CONFETTI = ['#ffe168', '#6cc39c', '#74b0dd', '#ea9277', '#a796da', '#1d7f55'];

export function LevelDone({
  title = 'Poziom zaliczony!',
  text,
  onNext,
  nextLabel = 'Następny poziom',
}: {
  title?: string;
  text?: string;
  onNext?: () => void;
  nextLabel?: string;
}) {
  // fixed pseudo-random spread so server/client markup match
  const bits = Array.from({ length: 18 }, (_, k) => {
    const a = (k / 18) * Math.PI * 2;
    const d = 60 + ((k * 37) % 70);
    return {
      k,
      x: `${Math.round(Math.cos(a) * d + 40)}px`,
      y: `${Math.round(Math.sin(a) * d * 0.7)}px`,
      r: `${(k * 53) % 360}deg`,
      c: CONFETTI[k % CONFETTI.length],
    };
  });
  return (
    <div className="nb-done" role="status">
      <div className="nb-confetti" aria-hidden>
        {bits.map((b) => (
          <i
            key={b.k}
            style={
              {
                background: b.c,
                '--x': b.x,
                '--y': b.y,
                '--r': b.r,
                '--k': b.k,
              } as CSSProperties
            }
          />
        ))}
      </div>
      <div className="nb-done-icon">
        <PartyPopper aria-hidden />
      </div>
      <div>
        <b>{title}</b>
        {text ? <span>{text}</span> : null}
      </div>
      {onNext ? (
        <button type="button" className="nb-btn success" onClick={onNext}>
          {nextLabel} <ArrowRight aria-hidden />
        </button>
      ) : null}
    </div>
  );
}

/* ── «you're back where you stopped» ─────────────────────────────────────── */
export function RestoredNote({ show, onDismiss }: { show: boolean; onDismiss: () => void }) {
  useEffect(() => {
    if (!show) return;
    const t = window.setTimeout(onDismiss, 9000);
    return () => window.clearTimeout(t);
    // onDismiss is a fresh closure every render — the timer must not restart because of it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);
  if (!show) return null;
  return (
    <div className="nb-fb info nb-restored" role="status">
      <History aria-hidden strokeWidth={2.2} />
      <div style={{ flex: 1 }}>
        <b>Kontynuujesz od miejsca, w którym przerwano.</b> Odpowiedzi są zapisane w tej przeglądarce.
      </div>
      <button type="button" className="nb-btn link" onClick={onDismiss} aria-label="Zamknij">
        <X size={16} aria-hidden />
      </button>
    </div>
  );
}

/* ── «start again» with an inline confirmation (no browser dialogs) ────────── */
export function ResetControl({
  onResetLevel,
  onResetAll,
  levelLabel = 'Ten poziom',
  allLabel = 'Wszystko',
  label = 'Zacznij od nowa',
  disabled,
}: {
  onResetLevel?: () => void;
  onResetAll: () => void;
  levelLabel?: string;
  allLabel?: string;
  label?: string;
  disabled?: boolean;
}) {
  const [ask, setAsk] = useState(false);
  if (!ask) {
    return (
      <button type="button" className="nb-btn ghost sm" disabled={disabled} onClick={() => setAsk(true)}>
        <RotateCcw aria-hidden /> {label}
      </button>
    );
  }
  const done = (fn: () => void) => () => {
    fn();
    setAsk(false);
  };
  return (
    <div className="nb-reset-ask" role="group" aria-label="Zacząć od nowa?">
      <span>Usunąć odpowiedzi i zacząć od nowa?</span>
      {onResetLevel ? (
        <button type="button" className="nb-btn sm" onClick={done(onResetLevel)}>
          {levelLabel}
        </button>
      ) : null}
      <button type="button" className={`nb-btn sm${onResetLevel ? ' ghost' : ''}`} onClick={done(onResetAll)}>
        {onResetLevel ? allLabel : 'Tak, od nowa'}
      </button>
      <button type="button" className="nb-btn link sm" onClick={() => setAsk(false)}>
        Anuluj
      </button>
    </div>
  );
}

/* ── keyboard key ──────────────────────────────────────────────────────────── */
export function Key({ children = 'Enter' }: { children?: ReactNode }) {
  return (
    <kbd className="nb-key">
      {children}
      {children === 'Enter' ? <CornerDownLeft aria-hidden /> : null}
    </kbd>
  );
}

/* ── «how it works» line under a level heading ────────────────────────────── */
export type TipKind = 'type' | 'type-long' | 'pick' | 'true-false' | 'match' | 'build' | 'write';

export function TaskTip({ kind }: { kind: TipKind }) {
  const kb = (() => {
    switch (kind) {
      case 'type':
        return (
          <>
            Wpisz odpowiedź i naciśnij <Key />. Dobrze? Kursor sam przejdzie do następnego zdania.
          </>
        );
      case 'type-long':
        return (
          <>
            Napisz zdanie i naciśnij <Key />. Nowa linia: <Key>Shift + Enter</Key>.
          </>
        );
      case 'pick':
        return <>Kliknij właściwą odpowiedź. Sprawdzamy od razu.</>;
      case 'true-false':
        return <>Wybierz „Prawda” albo „Fałsz”. Sprawdzamy od razu.</>;
      case 'match':
        return <>Kliknij element po lewej, potem jego parę po prawej.</>;
      case 'build':
        return <>Klikaj słowa po kolei. Pomyłka? Kliknij słowo w linijce, a wróci na dół.</>;
      case 'write':
        return <>Napisz odpowiedź i wyślij ją nauczycielowi.</>;
    }
  })();
  const touch =
    kind === 'type'
      ? 'Wpisz odpowiedź i dotknij „Sprawdź” albo „Dalej” na klawiaturze.'
      : kind === 'type-long'
        ? 'Napisz zdanie i dotknij „Sprawdź”.'
        : null;
  const Icon = kind === 'type' || kind === 'type-long' || kind === 'write' ? CornerDownLeft : MousePointerClick;
  return (
    <p className="nb-tip">
      <Icon aria-hidden />
      <span className={touch ? 'nb-only-kb' : undefined}>{kb}</span>
      {touch ? <span className="nb-only-touch">{touch}</span> : null}
    </p>
  );
}

/* ── several correct answers ───────────────────────────────────────────────── */
/** Other accepted answers worth showing after a correct one (no case/punctuation/diacritics-only twins). */
export function otherAnswers(given: string, expected: string, accept?: string[]): string[] {
  const seen = new Set([stripDiacritics(given)]);
  const out: string[] = [];
  for (const a of [expected, ...(accept ?? [])]) {
    const k = stripDiacritics(a);
    if (!normalizeAnswer(a) || seen.has(k)) continue;
    seen.add(k);
    out.push(a);
  }
  return out.slice(0, 3);
}

export function AlsoCorrect({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="nb-fb info" role="status">
      <Check aria-hidden strokeWidth={2.4} />
      <div>
        Też poprawnie:{' '}
        {items.map((a, i) => (
          <span key={a}>
            {i ? ' · ' : ''}
            <span className="pl">{a}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── Polish letters for students without a Polish keyboard ───────────────── */
const PL = ['ą', 'ć', 'ę', 'ł', 'ń', 'ó', 'ś', 'ź', 'ż'];

/** Inserts into the focused input/textarea; buttons don't steal focus (mousedown preventDefault). */
export function PolishKeys({ hint }: { hint?: ReactNode }) {
  const [upper, setUpper] = useState(false);
  const insert = (ch: string) => {
    const el = document.activeElement;
    if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return;
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const next = el.value.slice(0, start) + ch + el.value.slice(end);
    const proto = el instanceof HTMLInputElement ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(el, next);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    requestAnimationFrame(() => el.setSelectionRange(start + ch.length, start + ch.length));
  };
  return (
    <div className="nb-keys" aria-label="Polskie litery">
      {hint ? <span className="nb-keys-hint nb-only-kb">{hint}</span> : null}
      {PL.map((c) => {
        const ch = upper ? c.toUpperCase() : c;
        return (
          <button key={c} type="button" tabIndex={-1} onMouseDown={(e) => e.preventDefault()} onClick={() => insert(ch)}>
            {ch}
          </button>
        );
      })}
      <button
        type="button"
        className="shift"
        tabIndex={-1}
        aria-pressed={upper}
        title="Wielkie litery"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setUpper((u) => !u)}
      >
        ⇧
      </button>
    </div>
  );
}

/* ── split a sentence on its gap (___ / ____ / … ) ─────────────────────────── */
export function splitGap(text: string): { before: string; after: string } | null {
  const m = text.match(/_{2,}|…{2,}|\.{4,}/);
  if (!m || m.index == null) return null;
  return { before: text.slice(0, m.index), after: text.slice(m.index + m[0].length) };
}

/** Width for an inline gap so the expected answer fits without revealing it exactly. */
export function gapWidth(expected: string) {
  // bucketed, so the width hints at «short / long» without giving the exact length away
  const n = expected.length;
  return n <= 6 ? '6.5em' : n <= 11 ? '9em' : n <= 18 ? '12.5em' : '16em';
}
