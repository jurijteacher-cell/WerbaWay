import type { Metadata } from 'next';
import { getT } from '@/i18n/server';
import { SITE_DESCRIPTION_KEY, siteJsonLd } from '@/lib/site';

/**
 * Вхід — це і головна для гостя: middleware показує його за адресою «/» (rewrite, не redirect),
 * тож саме цю сторінку Google бачить як werbaway.com. Звідси canonical на «/» і JSON-LD сайту.
 */
export function generateMetadata(): Metadata {
  return { alternates: { canonical: '/' } };
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  const t = getT();
  const jsonLd = JSON.stringify(siteJsonLd(t(SITE_DESCRIPTION_KEY))).replace(/</g, '\\u003c');
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      {children}
    </>
  );
}
