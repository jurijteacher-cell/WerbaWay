#!/usr/bin/env node
/**
 * Обробка після імпорту з Notion (запускати після notion-import.mjs і pair-teacher-pages.mjs):
 *   node scripts/postprocess-pages.mjs [--dry]
 *
 * 1. Окрема сторінка «Praca domowa: …» з тим самим уроком, що й лекція, стає розділом домашки цієї лекції
 *    (на сайті домашка — окрема сторінка /learn/<лекція>/hw). Лекція отримує slug = id уроку з вправ.
 * 2. Посилання на сторінки Notion замінюються адресами сайту (лекція → /learn/…, домашка → /learn/…/hw,
 *    сторінка викладача → /teacher/lesson/…). Невідомі посилання на Notion лишаються текстом.
 */
import { readdirSync, readFileSync, writeFileSync, renameSync, unlinkSync, existsSync } from 'node:fs';
import path from 'node:path';

const DRY = process.argv.includes('--dry');
const PAGES = path.join(process.cwd(), 'src/content/pages');
const TEACH = path.join(process.cwd(), 'src/content/teacher-pages');
const HW_TITLE = /^(praca domowa|zadanie domowe|домашн|homework)/i;
const HW_HEAD = /^##\s+.*(praca\s+domowa|zadani[ea]\s+domow|домашн|homework).*$/im;

const read = (dir, f) => readFileSync(path.join(dir, f), 'utf8');
const split = (raw) => {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  const data = {};
  for (const l of (m?.[1] ?? '').split('\n')) {
    const i = l.indexOf(':');
    if (i > 0) data[l.slice(0, i).trim()] = l.slice(i + 1).trim();
  }
  return { head: m?.[0] ?? '', data, body: raw.slice(m?.[0].length ?? 0) };
};
const idOf = (url) => url?.match(/([0-9a-f]{32})(?:[?#].*)?$/)?.[1] ?? null;
const lessonIdOf = (body) => body.match(/\/embed\/([a-z0-9][a-z0-9-]*)\//)?.[1] ?? null;
const log = (...a) => console.log(...a);

/* ── 1. сторінки домашки → розділ лекції ── */
let pages = readdirSync(PAGES).filter((f) => f.endsWith('.md')).map((f) => ({ f, slug: f.slice(0, -3), ...split(read(PAGES, f)) }));
const links = new Map(); // notion id → адреса на сайті

for (const hw of pages.filter((p) => HW_TITLE.test(p.data.title ?? ''))) {
  const lid = lessonIdOf(hw.body);
  const lesson = lid && pages.find((p) => p !== hw && !HW_TITLE.test(p.data.title ?? '') && lessonIdOf(p.body) === lid);
  if (!lesson) continue;
  // зміст сторінки домашки: її «##» стають «###» у розділі домашки лекції
  const hwBody = hw.body.trim().replace(/^## /gm, '### ');
  const section = `## 🏠 Praca domowa\n\n${hwBody}\n`;
  let body = lesson.body;
  const m = body.match(HW_HEAD);
  if (m) {
    const start = m.index;
    const after = body.slice(start + m[0].length);
    const next = after.search(/^## /m);
    body = body.slice(0, start) + section + (next >= 0 ? '\n' + after.slice(next) : '');
  } else body = body.trimEnd() + '\n\n---\n\n' + section;

  const target = lid; // лекція повертає собі id уроку
  log(`homework ${hw.slug} → section of ${lesson.slug}${lesson.slug !== target ? ` (renamed to ${target})` : ''}`);
  if (hw.data.notion && idOf(hw.data.notion)) links.set(idOf(hw.data.notion), `/learn/${target}/hw`);
  if (!DRY) {
    unlinkSync(path.join(PAGES, hw.f));
    writeFileSync(path.join(PAGES, `${target}.md`), lesson.head + body);
    if (lesson.slug !== target) {
      unlinkSync(path.join(PAGES, lesson.f));
      // сторінка викладача за старим slug — під новий
      const old = path.join(TEACH, `${lesson.slug}.md`);
      if (existsSync(old)) {
        const t = read(TEACH, `${lesson.slug}.md`).replace(/^teacherOf:.*$/m, `teacherOf: ${target}`);
        writeFileSync(path.join(TEACH, `${target}.md`), t);
        unlinkSync(old);
      }
    }
  }
}

/* ── 2. посилання на Notion → адреси сайту ── */
pages = readdirSync(PAGES).filter((f) => f.endsWith('.md')).map((f) => ({ f, slug: f.slice(0, -3), ...split(read(PAGES, f)) }));
const teach = existsSync(TEACH)
  ? readdirSync(TEACH).filter((f) => f.endsWith('.md')).map((f) => ({ f, slug: f.slice(0, -3), ...split(read(TEACH, f)) }))
  : [];
for (const p of pages) if (idOf(p.data.notion)) links.set(idOf(p.data.notion), `/learn/${p.slug}`);
for (const t of teach) if (idOf(t.data.notion)) links.set(idOf(t.data.notion), `/teacher/lesson/${t.slug}`);

const NOTION_A = /<a href="https?:\/\/(?:app\.notion\.com|(?:www\.)?notion\.so)\/[^"]*?"[^>]*>([\s\S]*?)<\/a>/g;
let fixed = 0;
let dropped = 0;
for (const [dir, list] of [
  [PAGES, pages],
  [TEACH, teach],
]) {
  for (const p of list) {
    const raw = read(dir, p.f);
    const out = raw.replace(NOTION_A, (full, text) => {
      const id = idOf(full.match(/href="([^"]+)"/)[1]);
      const to = id && links.get(id);
      if (to) {
        fixed++;
        return `<a href="${to}">${text}</a>`;
      }
      dropped++;
      return text;
    });
    if (out !== raw && !DRY) writeFileSync(path.join(dir, p.f), out);
  }
}
log(`notion links → site: ${fixed}, unknown (left as text): ${dropped}`);
