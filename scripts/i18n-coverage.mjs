#!/usr/bin/env node
/**
 * Чи є в лекції всі мови сайту (ru, pl, en) — рахує прямо з джерела, без _source.
 * Лекція, написана російською (`glossLang: ru` у шапці сторінки), мусить мати ще й `uk`:
 * українська — мова сайту за замовчуванням, і без `.uk.json` учень з UA бачив би російську.
 *
 *   node scripts/i18n-coverage.mjs                    # усі лекції й вправи
 *   node scripts/i18n-coverage.mjs pl-a2-60-wspomnienia   # одна лекція (сторінка + усі її JSON)
 *   npm run check:i18n -- <lesson_id>
 *
 * Код виходу 1, якщо хоч одна одиниця пояснення не має перекладу хоч однією мовою.
 * Лекцію без повного покриття не пушити (SITE_PUBLISHING §8).
 */
import { readFileSync, readdirSync, existsSync } from 'fs';
import path from 'path';
import { segmentMarkdown, segmentJson, pageGlossLang, SKIP_GLOSS_LANG } from '../src/i18n/segment.mjs';

const ROOT = process.cwd();
const LOCALES = ['ru', 'pl', 'en'];
const ids = process.argv.slice(2).filter((x) => !x.startsWith('-'));
const match = (name) => !ids.length || ids.some((id) => name === id || name.startsWith(id + '-'));

function load(file) {
  if (!existsSync(file)) return {};
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return {};
  }
}

const rows = [];
/** Лекції з поясненнями російською: їм потрібна ще й українська карта. */
const ruLessons = [];
const pagesDir = path.join(ROOT, 'src/content/pages');
for (const f of readdirSync(pagesDir).filter((x) => x.endsWith('.md'))) {
  const slug = f.replace(/\.md$/, '');
  if (!match(slug)) continue;
  const raw = readFileSync(path.join(pagesDir, f), 'utf8');
  const gl = pageGlossLang(raw);
  if (gl && SKIP_GLOSS_LANG.test(gl)) continue;
  if (gl === 'ru') ruLessons.push(slug);
  rows.push({ kind: 'page', name: slug, units: segmentMarkdown(raw), dir: 'pages' });
}
const exDir = path.join(ROOT, 'src/content/queue-published');
for (const f of readdirSync(exDir).filter((x) => x.endsWith('.json'))) {
  const base = f.replace(/\.json$/, '');
  if (!match(base)) continue;
  let obj;
  try {
    obj = JSON.parse(readFileSync(path.join(exDir, f), 'utf8'));
  } catch {
    continue;
  }
  rows.push({ kind: 'json', name: base, units: segmentJson(obj), dir: 'exercises' });
}
const EX_SUFFIX = /-(vocab|grammar|hw|comm-tasks|exam|slides|pictures|test|mock)$/;
const isRu = (r) =>
  ruLessons.some((id) => r.name === id || (r.kind === 'json' && r.name.replace(EX_SUFFIX, '') === id)) ||
  existsSync(path.join(ROOT, 'src/content/i18n', r.dir, `${r.name}.uk.json`));
/** uk вимагаємо лише там, де справді російська (ы э ъ ё) або підпис «z rosyjskiego»; «## …» не чіпаємо — з них ключі кроків. */
const needsUk = (u) =>
  !/^##\s/.test(u.text) && !/[іїєґІЇЄҐ]/.test(u.text) && (/[ыэъёЫЭЪЁ]/.test(u.text) || /rosyjsk/.test(u.text));

let bad = 0;
let missingUnits = 0;
for (const r of rows) {
  if (!r.units.length) continue;
  const gaps = [];
  for (const l of isRu(r) ? [...LOCALES, 'uk'] : LOCALES) {
    const m = load(path.join(ROOT, 'src/content/i18n', r.dir, `${r.name}.${l}.json`));
    // uk: лише одиниці російською; рядки, уже написані українською, лишаються як є
    const keys = (l === 'uk' ? r.units.filter(needsUk) : r.units).map((u) => u.key);
    const miss = keys.filter((k) => !m[k]).length;
    if (miss) gaps.push(`${l} −${miss}`);
    missingUnits += miss;
  }
  if (gaps.length) {
    bad++;
    console.log(`✗ ${r.kind.padEnd(4)} ${r.name.padEnd(52)} ${r.units.length} од. · ${gaps.join(' · ')}`);
  }
}
const checked = rows.filter((r) => r.units.length).length;
if (!bad) console.log(`✓ ${checked} файлів — усі мови (${LOCALES.join(', ')}; uk для лекцій російською) на місці`);
else console.log(`\n${bad} з ${checked} файлів без повного перекладу, бракує ${missingUnits} одиниць.`);
process.exit(bad ? 1 : 0);
