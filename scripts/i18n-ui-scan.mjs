#!/usr/bin/env node
/**
 * Інвентаризація рядків інтерфейсу: усе кириличне, що бачить людина.
 * Коментарі відкидаються — перекладати треба текст на екрані, а не пояснення в коді.
 *
 *   node scripts/i18n-ui-scan.mjs            # зведення по файлах
 *   node scripts/i18n-ui-scan.mjs --list     # усі рядки
 *   node scripts/i18n-ui-scan.mjs --dict     # заготовка словника uk.json
 */
import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from 'fs';
import path from 'path';

const ROOT = path.join(process.cwd(), 'src');

/**
 * Не чіпаємо:
 *  · notion-sync — це НАЗВИ ВЛАСТИВОСТЕЙ у базах Notion, а не текст на екрані;
 *    переклад зламав би синхронізацію результатів;
 *  · diag — службова сторінка діагностики для викладача;
 *  · content/lessons, content/lectures — старий формат лекцій, з якого школа йде.
 */
const SKIP = [
  'lib/embed-results/notion-sync.ts',
  'app/diag/route.ts',
  'content/lessons/',
  'content/lectures/',
];
const CYR = /[Ѐ-ӿ]/;

function files(dir) {
  const out = [];
  for (const e of readdirSync(dir)) {
    const full = path.join(dir, e);
    if (statSync(full).isDirectory()) out.push(...files(full));
    else if (
      /\.(tsx?|mjs)$/.test(e) &&
      !full.includes(`${path.sep}i18n${path.sep}`) &&
      !SKIP.some((x) => full.includes(x.split('/').join(path.sep)))
    )
      out.push(full);
  }
  return out;
}

/** Викидає // … і /* … *\/, щоб коментарі не потрапили в словник. */
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, p1) => p1 + ' '.repeat(Math.max(0, m.length - p1.length)));
}

const STRING_RE = /'([^'\\\n]*(?:\\.[^'\\\n]*)*)'|"([^"\\\n]*(?:\\.[^"\\\n]*)*)"|`([^`\\]*(?:\\.[^`\\]*)*)`/g;
/** Текст між тегами JSX: >текст< */
const JSX_TEXT_RE = />([^<>{}\n]*[Ѐ-ӿ][^<>{}]*)</g;

const perFile = new Map();
const all = new Map();

for (const f of files(ROOT)) {
  const src = stripComments(readFileSync(f, 'utf8'));
  const found = new Set();

  for (const m of src.matchAll(STRING_RE)) {
    const s = m[1] ?? m[2] ?? m[3] ?? '';
    if (CYR.test(s)) found.add(s.trim());
  }
  for (const m of src.matchAll(JSX_TEXT_RE)) {
    const s = m[1].trim();
    if (s && CYR.test(s)) found.add(s);
  }
  if (!found.size) continue;
  const rel = path.relative(process.cwd(), f);
  perFile.set(rel, [...found]);
  for (const s of found) all.set(s, (all.get(s) ?? 0) + 1);
}

if (process.argv.includes('--dict')) {
  const dict = Object.fromEntries([...all.keys()].sort((a, b) => a.localeCompare(b, 'uk')).map((k) => [k, k]));
  const out = path.join(process.cwd(), 'src/i18n/dict/uk.json');
  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(dict, null, 2) + '\n', 'utf8');
  console.log('uk.json: %d рядків', all.size);
} else if (process.argv.includes('--list')) {
  for (const [f, list] of [...perFile].sort()) {
    console.log(`\n${f}  (${list.length})`);
    for (const s of list) console.log('  ', JSON.stringify(s));
  }
} else {
  const rows = [...perFile].sort((a, b) => b[1].length - a[1].length);
  for (const [f, list] of rows) console.log(String(list.length).padStart(4), f);
  console.log('\nФайлів: %d, унікальних рядків: %d', perFile.size, all.size);
}
