/**
 * Легка розмітка тексту на дошці: лише жирний, курсив і перенос рядка.
 * Зберігається рядком: `<b>…</b>`, `<i>…</i>`, `<br>`; усе інше екранується (&amp; &lt; &gt;).
 * Старі дошки, де в тексті були звичайні `\n`, читаються без змін.
 * Рядок, що пройшов через toHtml(), безпечний для dangerouslySetInnerHTML: тегів, крім b/i/br, у ньому не буває.
 */

export type Run = { t: string; b: boolean; i: boolean };

/** скільки символів тексту (без тегів) вміщує один елемент */
export const MAX_PLAIN = 500;

const TOKEN = /(<\/?[bi]>|<br\s*\/?>)/gi;

const unesc = (s: string) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function parse(src: string): Run[] {
  const runs: Run[] = [];
  let b = false;
  let i = false;
  for (const part of String(src ?? '').split(TOKEN)) {
    if (!part) continue;
    const tag = part.toLowerCase();
    if (tag === '<b>') b = true;
    else if (tag === '</b>') b = false;
    else if (tag === '<i>') i = true;
    else if (tag === '</i>') i = false;
    else if (/^<br\s*\/?>$/.test(tag)) runs.push({ t: '\n', b, i });
    else runs.push({ t: unesc(part), b, i });
  }
  return runs;
}

export function serialize(runs: Run[]): string {
  // склеюємо сусідні шматки з однаковим форматуванням
  const merged: Run[] = [];
  for (const r of runs) {
    if (!r.t) continue;
    const last = merged[merged.length - 1];
    if (last && last.b === r.b && last.i === r.i) last.t += r.t;
    else merged.push({ ...r });
  }
  return merged
    .map((r) => {
      let h = r.t
        .split('\n')
        .map(esc)
        .join('<br>');
      if (r.i) h = `<i>${h}</i>`;
      if (r.b) h = `<b>${h}</b>`;
      return h;
    })
    .join('');
}

/** нормалізований безпечний HTML для показу */
export const toHtml = (src: string) => serialize(parse(src));

/** звичайний текст без тегів (з \n) */
export const plainOf = (src: string) => parse(src).map((r) => r.t).join('');

export const plainLen = (src: string) => plainOf(src).length;

/** обрізає текст до max символів, не ламаючи теги */
export function clampMarkup(src: string, max = MAX_PLAIN): string {
  const runs = parse(src);
  let left = max;
  const out: Run[] = [];
  for (const r of runs) {
    if (left <= 0) break;
    const t = r.t.length > left ? r.t.slice(0, left) : r.t;
    left -= t.length;
    out.push({ ...r, t });
  }
  return serialize(out);
}

/** весь видимий текст уже має це форматування? */
export function isAll(src: string, flag: 'b' | 'i'): boolean {
  const runs = parse(src).filter((r) => r.t.replace(/\n/g, '') !== '');
  return runs.length > 0 && runs.every((r) => r[flag]);
}

/** увімкнути/вимкнути форматування на всьому тексті */
export function toggleAll(src: string, flag: 'b' | 'i'): string {
  const on = !isAll(src, flag);
  return serialize(parse(src).map((r) => ({ ...r, [flag]: on })));
}

/** кількість рядків (для висоти вільного тексту) */
export const lineCount = (src: string) => Math.max(1, plainOf(src).split('\n').length);

/**
 * Зчитує вміст contentEditable у розмітку. Браузери по-різному вставляють <div>/<br>/<b>/<strong>/style,
 * тому читаємо DOM самі й збираємо лише b/i/переноси.
 */
export function domToMarkup(root: HTMLElement): string {
  const runs: Run[] = [];
  const push = (t: string, b: boolean, i: boolean) => {
    if (t) runs.push({ t, b, i });
  };
  const atLineStart = () => runs.length === 0 || runs[runs.length - 1].t.endsWith('\n');

  const walk = (node: Node, b: boolean, i: boolean) => {
    if (node.nodeType === Node.TEXT_NODE) {
      push((node.textContent ?? '').replace(/[​﻿]/g, '').replace(/ /g, ' '), b, i);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as HTMLElement;
    const tag = el.tagName;
    if (tag === 'BR') {
      push('\n', b, i);
      return;
    }
    const st = el.style;
    const bold = b || tag === 'B' || tag === 'STRONG' || st.fontWeight === 'bold' || Number(st.fontWeight) >= 600;
    const ital = i || tag === 'I' || tag === 'EM' || st.fontStyle === 'italic';
    const block = tag === 'DIV' || tag === 'P' || tag === 'LI';
    if (block && !atLineStart()) push('\n', bold, ital);
    el.childNodes.forEach((c) => walk(c, bold, ital));
  };
  root.childNodes.forEach((c) => walk(c, false, false));

  // браузер ставить зайвий <br> в кінці рядка як заглушку — його прибираємо
  const last = runs[runs.length - 1];
  if (last && last.t.endsWith('\n')) last.t = last.t.slice(0, -1);
  return serialize(runs);
}
