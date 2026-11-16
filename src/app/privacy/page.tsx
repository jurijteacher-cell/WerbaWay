import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal/LegalPage';
import { PRIVACY } from '@/content/legal/privacy';
import { getLocale } from '@/i18n/server';

/** Політика конфіденційності — публічна (її вимагає Google для входу через Google). Текст — src/content/legal/privacy.ts */
export function generateMetadata(): Metadata {
  const doc = PRIVACY[getLocale()] ?? PRIVACY.uk;
  return { title: `${doc.title} · Werba Way`, description: doc.lead };
}

export default function PrivacyPage() {
  return <LegalPage docs={PRIVACY} current="privacy" />;
}
