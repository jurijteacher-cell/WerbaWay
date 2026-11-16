import Link from 'next/link';
import { getLocale } from '@/i18n/server';
import type { Locale } from '@/i18n/config';
import { LEGAL_EMAIL, LEGAL_UPDATED, type LegalBlock, type LegalDoc, type LegalUi } from '@/content/legal/types';

const UI: Record<Locale, LegalUi> = {
  uk: { updated: 'Оновлено', toc: 'Зміст', contact: 'Залишилися питання?', contactText: 'Напишіть нам — відповімо особисто.', privacy: 'Конфіденційність', terms: 'Умови користування', back: '← На сайт', print: 'Друк' },
  ru: { updated: 'Обновлено', toc: 'Содержание', contact: 'Остались вопросы?', contactText: 'Напишите нам — ответим лично.', privacy: 'Конфиденциальность', terms: 'Условия использования', back: '← На сайт', print: 'Печать' },
  pl: { updated: 'Aktualizacja', toc: 'Spis treści', contact: 'Masz pytania?', contactText: 'Napisz do nas — odpowiemy osobiście.', privacy: 'Prywatność', terms: 'Regulamin', back: '← Do serwisu', print: 'Drukuj' },
  en: { updated: 'Updated', toc: 'Contents', contact: 'Any questions?', contactText: 'Write to us — we reply personally.', privacy: 'Privacy', terms: 'Terms of use', back: '← Back to site', print: 'Print' },
};

const DATE_LOCALE: Record<Locale, string> = { uk: 'uk-UA', ru: 'ru-RU', pl: 'pl-PL', en: 'en-GB' };

/** Адресу пошти в тексті робимо посиланням */
function Rich({ text }: { text: string }) {
  const parts = text.split(LEGAL_EMAIL);
  return (
    <>
      {parts.map((p, i) => (
        <span key={i}>
          {p}
          {i < parts.length - 1 && (
            <a href={`mailto:${LEGAL_EMAIL}`} className="font-semibold text-gold underline decoration-gold/30 underline-offset-2 hover:text-gold-bright">
              {LEGAL_EMAIL}
            </a>
          )}
        </span>
      ))}
    </>
  );
}

function Block({ b }: { b: LegalBlock }) {
  if (typeof b === 'string') {
    return (
      <p className="leading-relaxed text-paper/80">
        <Rich text={b} />
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-2.5">
      {b.list.map((x) => (
        <li key={x} className="flex gap-3 leading-relaxed text-paper/80">
          <span className="mt-[0.55em] h-1.5 w-1.5 flex-none rounded-full bg-gold" aria-hidden="true" />
          <span>
            <Rich text={x} />
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Оформлення /privacy і /terms: перемикач між документами, тези, зміст (липкий на десктопі),
 * пронумеровані розділи з якорями, картка контакту. Мова — мова сайту.
 */
export function LegalPage({ docs, current }: { docs: Record<Locale, LegalDoc>; current: 'privacy' | 'terms' }) {
  const locale = getLocale();
  const doc = docs[locale] ?? docs.uk;
  const ui = UI[locale] ?? UI.uk;
  const date = new Intl.DateTimeFormat(DATE_LOCALE[locale], { day: 'numeric', month: 'long', year: 'numeric' }).format(
    new Date(`${LEGAL_UPDATED}T12:00:00Z`)
  );

  const tab = (href: string, label: string, active: boolean) => (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
        active ? 'bg-gold-solid text-white shadow-sm' : 'text-paper-muted hover:text-paper'
      }`}
    >
      {label}
    </Link>
  );

  return (
    <main className="mx-auto max-w-5xl px-4 pb-20 pt-8 sm:pt-12">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <Link href="/" className="text-sm text-paper-muted hover:text-gold">
          {ui.back}
        </Link>
        <nav className="inline-flex rounded-full border border-ink-line bg-ink-raised p-1" aria-label={`${ui.privacy} / ${ui.terms}`}>
          {tab('/privacy', ui.privacy, current === 'privacy')}
          {tab('/terms', ui.terms, current === 'terms')}
        </nav>
      </div>

      <header className="relative mb-10 overflow-hidden rounded-[28px] border border-ink-line bg-ink-raised px-6 py-9 sm:px-10 sm:py-12">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-60 blur-3xl"
          style={{ background: 'radial-gradient(circle, #e4d9ff 0%, #d3e9fb 55%, transparent 75%)' }}
        />
        <p className="relative mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-gold">Werba Way</p>
        <h1 className="relative mb-4 font-display text-4xl leading-tight text-paper sm:text-5xl">{doc.title}</h1>
        <p className="relative max-w-2xl text-lg leading-relaxed text-paper-muted">{doc.lead}</p>
        <p className="relative mt-5 text-sm text-paper-muted">
          {ui.updated}: <time dateTime={LEGAL_UPDATED}>{date}</time>
        </p>
        <ul className="relative mt-7 flex flex-wrap gap-2">
          {doc.highlights.map((h) => (
            <li key={h} className="inline-flex items-center gap-1.5 rounded-full border border-ink-line bg-ink-soft px-3 py-1.5 text-sm font-medium text-paper">
              <span className="text-correct" aria-hidden="true">
                ✓
              </span>
              {h}
            </li>
          ))}
        </ul>
      </header>

      <div className="grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-paper-muted">{ui.toc}</p>
          <ol className="flex flex-col gap-1 border-l border-ink-line">
            {doc.sections.map((s, i) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="-ml-px block border-l-2 border-transparent py-1 pl-4 text-sm text-paper-muted hover:border-gold hover:text-paper">
                  <span className="mr-2 tabular-nums text-paper-muted/70">{i + 1}.</span>
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </aside>

        <article className="flex min-w-0 flex-col gap-5">
          {doc.sections.map((s, i) => (
            <section key={s.id} id={s.id} className="scroll-mt-24 rounded-[22px] border border-ink-line bg-ink-raised p-6 sm:p-8">
              <h2 className="mb-4 flex items-baseline gap-3 font-display text-2xl text-paper">
                <span className="inline-flex h-8 w-8 flex-none items-center justify-center rounded-full bg-gold-fill text-sm font-semibold tabular-nums text-gold-bright">
                  {i + 1}
                </span>
                <a href={`#${s.id}`} className="hover:text-gold">
                  {s.title}
                </a>
              </h2>
              <div className="flex flex-col gap-4">
                {s.body.map((b, j) => (
                  <Block key={j} b={b} />
                ))}
              </div>
            </section>
          ))}

          <section className="flex flex-wrap items-center justify-between gap-4 rounded-[22px] border border-gold/20 bg-gold-fill/40 p-6 sm:p-8">
            <div>
              <h2 className="mb-1 font-display text-2xl text-paper">{ui.contact}</h2>
              <p className="text-paper-muted">{ui.contactText}</p>
            </div>
            <a href={`mailto:${LEGAL_EMAIL}`} className="ww-btn ww-btn-primary ww-btn-lg">
              {LEGAL_EMAIL}
            </a>
          </section>

          <p className="text-center text-sm text-paper-muted">
            {current === 'privacy' ? (
              <Link href="/terms" className="text-gold hover:text-gold-bright">
                {ui.terms} →
              </Link>
            ) : (
              <Link href="/privacy" className="text-gold hover:text-gold-bright">
                {ui.privacy} →
              </Link>
            )}
          </p>
        </article>
      </div>
    </main>
  );
}
