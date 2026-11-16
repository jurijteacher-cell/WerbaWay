'use client';

import Link from 'next/link';
import { useT } from '@/i18n/client';

/** Посилання на умови й політику під формами входу/реєстрації; consent — рядок про згоду (реєстрація) */
export function LegalLinks({ consent }: { consent?: boolean }) {
  const t = useT();
  const terms = (
    <Link href="/terms" className="text-paper-muted underline decoration-ink-edge underline-offset-2 hover:text-gold">
      {t("Умови користування")}
    </Link>
  );
  const privacy = (
    <Link href="/privacy" className="text-paper-muted underline decoration-ink-edge underline-offset-2 hover:text-gold">
      {t("Політика конфіденційності")}
    </Link>
  );
  if (consent) {
    // одне речення на мову; посилання — у знахідному відмінку («приймаєш … Політику …»)
    const cls = 'text-paper-muted underline decoration-ink-edge underline-offset-2 hover:text-gold';
    const links: Record<string, JSX.Element> = {
      terms: (
        <Link key="t" href="/terms" className={cls}>
          {t("Умови користування")}
        </Link>
      ),
      privacy: (
        <Link key="p" href="/privacy" className={cls}>
          {t("Політику конфіденційності")}
        </Link>
      ),
    };
    const sentence = t("Реєструючись, ти приймаєш {terms} і {privacy}.");
    return (
      <p className="mt-8 text-center text-xs leading-relaxed text-paper-muted">
        {sentence.split(/(\{terms\}|\{privacy\})/).map((part, i) => {
          const m = /^\{(terms|privacy)\}$/.exec(part);
          return m ? links[m[1]] : <span key={i}>{part}</span>;
        })}
      </p>
    );
  }
  return (
    <p className="mt-8 flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs">
      {terms}
      <span aria-hidden="true" className="text-ink-edge">·</span>
      {privacy}
    </p>
  );
}
