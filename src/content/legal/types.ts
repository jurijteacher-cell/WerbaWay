/** Юридичні сторінки (/privacy, /terms): текст окремо для кожної мови сайту. */
export type LegalBlock = string | { list: string[] };

export type LegalSection = { id: string; title: string; body: LegalBlock[] };

export type LegalDoc = {
  title: string;
  lead: string;
  /** короткі тези над текстом («без реклами» тощо) */
  highlights: string[];
  sections: LegalSection[];
};

/** Підписи навколо тексту — однакові для обох документів */
export type LegalUi = {
  updated: string;
  toc: string;
  contact: string;
  contactText: string;
  privacy: string;
  terms: string;
  back: string;
  print: string;
};

export const LEGAL_UPDATED = '2026-11-16';
export const LEGAL_EMAIL = 'werbaway@gmail.com';
