#!/usr/bin/env node
/**
 * Прив'язує сторінки «TEACHER · …» до учнівських лекцій, яких імпорт не зв'язав за вправами.
 *   node scripts/pair-teacher-pages.mjs [--dry]
 * Правила (по черзі): той самий курс і № у курсі → той самий номер у назві («01 ·») → схожа назва.
 * Зв'язана сторінка перейменовується в src/content/teacher-pages/<slug лекції>.md і отримує teacherOf.
 */
import { readdirSync, readFileSync, writeFileSync, renameSync, existsSync } from 'node:fs';
import path from 'node:path';

const DRY = process.argv.includes('--dry');
const PAGES = path.join(process.cwd(), 'src/content/pages');
const TEACH = path.join(process.cwd(), 'src/content/teacher-pages');

const fm = (raw) => {
  const m = raw.match(/^---\n([\s\S]*?)\n---/);
  const d = {};
  for (const l of (m?.[1] ?? '').split('\n')) {
    const i = l.indexOf(':');
    if (i > 0) d[l.slice(0, i).trim()] = l.slice(i + 1).trim();
  }
  return d;
};
const norm = (s) =>
  (s ?? '')
    .toLowerCase()
    .replace(/^teacher\s*·\s*/i, '')
    .replace(/\((a0|a1|a2|b1|b2)\)/gi, '')
    .replace(/[^\p{L}\p{N} ]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
const lead = (s) => (s ?? '').match(/^(?:teacher\s*·\s*)?(?:lekcja\s*)?(r?\d+)\s*·/i)?.[1]?.toLowerCase() ?? null;
const words = (s) => new Set(norm(s).split(' ').filter((w) => w.length > 3));
const overlap = (a, b) => {
  const A = words(a), B = words(b);
  if (!A.size || !B.size) return 0;
  let n = 0;
  for (const w of A) if (B.has(w)) n++;
  return n / Math.min(A.size, B.size);
};

const students = readdirSync(PAGES)
  .filter((f) => f.endsWith('.md'))
  .map((f) => ({ slug: f.slice(0, -3), ...fm(readFileSync(path.join(PAGES, f), 'utf8')) }));
const taken = new Set(readdirSync(TEACH).filter((f) => !f.startsWith('teacher-')).map((f) => f.slice(0, -3)));

let paired = 0;
const left = [];
for (const f of readdirSync(TEACH).filter((f) => f.startsWith('teacher-') && f.endsWith('.md'))) {
  const raw = readFileSync(path.join(TEACH, f), 'utf8');
  const t = fm(raw);
  const same = students.filter((s) => s.module === t.module && !taken.has(s.slug));
  let hit = null;
  if (t.number) {
    const c = same.filter((s) => s.number === t.number);
    if (c.length === 1) hit = c[0];
  }
  if (!hit && lead(t.title)) {
    const c = same.filter((s) => lead(s.title) === lead(t.title));
    if (c.length === 1) hit = c[0];
  }
  if (!hit) {
    const scored = same.map((s) => ({ s, k: overlap(s.title, t.title) })).sort((a, b) => b.k - a.k);
    if (scored[0] && scored[0].k >= 0.6 && (!scored[1] || scored[1].k < scored[0].k)) hit = scored[0].s;
  }
  if (!hit) {
    left.push(`${f}  (${t.module ?? '-'} · ${t.title})`);
    continue;
  }
  taken.add(hit.slug);
  paired++;
  console.log(`${f}  →  ${hit.slug}.md`);
  if (!DRY) {
    const out = raw.replace(/^teacherOf:.*\n/m, '').replace(/^---\n/, `---\nteacherOf: ${hit.slug}\n`);
    writeFileSync(path.join(TEACH, f), out);
    const dest = path.join(TEACH, `${hit.slug}.md`);
    if (!existsSync(dest)) renameSync(path.join(TEACH, f), dest);
  }
}
console.log(`\npaired: ${paired}, still unpaired: ${left.length}`);
for (const l of left) console.log('  ' + l);
