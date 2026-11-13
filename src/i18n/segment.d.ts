export type SegmentUnit = {
  key: string;
  text: string;
  kind: 'meta' | 'cell' | 'line' | 'embed-title' | 'json';
  field?: string;
  path?: string;
  context?: string;
};

export type TranslationMap = Record<string, string>;

export function unitKey(text: string): string;
export function hasCyrillic(s: string): boolean;
export const SKIP_GLOSS_LANG: RegExp;
export function pageGlossLang(raw: string): string | null;
export function walkMarkdown(
  raw: string,
  fn: (text: string, meta: Omit<SegmentUnit, 'key' | 'text'>) => string | undefined
): string;
export function segmentMarkdown(raw: string): SegmentUnit[];
export function applyMarkdown(raw: string, map?: TranslationMap | null): string;
export function walkJson<T>(
  node: T,
  fn: (text: string, meta: Omit<SegmentUnit, 'key' | 'text'>) => string | undefined,
  path?: string[],
  root?: unknown
): T;
export function segmentJson(obj: unknown): SegmentUnit[];
export function applyJson<T>(obj: T, map?: TranslationMap | null): T;
