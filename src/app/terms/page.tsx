import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal/LegalPage';
import { TERMS } from '@/content/legal/terms';
import { getLocale } from '@/i18n/server';

/** Умови користування — публічна сторінка. Текст — src/content/legal/terms.ts */
export function generateMetadata(): Metadata {
  const doc = TERMS[getLocale()] ?? TERMS.uk;
  return { title: `${doc.title} · Werba Way`, description: doc.lead };
}

export default function TermsPage() {
  return <LegalPage docs={TERMS} current="terms" />;
}
