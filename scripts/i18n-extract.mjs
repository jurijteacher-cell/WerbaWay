#!/usr/bin/env node
/**
 * Витяг одиниць перекладу з лекцій і вправ.
 *
 *   node scripts/i18n-extract.mjs            # зібрати каталоги
 *   node scripts/i18n-extract.mjs --stats    # лише порахувати
 *
 * Каталоги лягають у src/content/i18n/_source/… — це вхід для перекладу.
 * Переклади зберігаються поряд: src/content/i18n/pages/<slug>.<locale>.json
 * у вигляді { ключ: "переклад" }. Ключ рахується з тексту джерела, тому
 * правка польського тіла лекції не ламає вже перекладені глоси.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'fs';
import path from 'path';
import { segmentMarkdown, segmentJson, pageGlossLang, SKIP_GLOSS_LANG } from '../src/i18n/segment.mjs';

const ROOT = process.cwd();
const PAGES = path.join(ROOT, 'src/content/pages');
const EXERCISES = path.join(ROOT, 'src/content/queue-published');
const OUT = path.join(ROOT, 'src/content/i18n/_source');

const statsOnly = process.argv.includes('--stats');

function write(file, data) {
  if (statsOnly) return;
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

let pageFiles = 0;
let pageUnits = 0;
let pageChars = 0;
const skipped = [];

for (const f of readdirSync(PAGES).filter((x) => x.endsWith('.md')).sort()) {
  const slug = f.replace(/\.md$/, '');
  const raw = readFileSync(path.join(PAGES, f), 'utf8');
  const gl = pageGlossLang(raw);
  if (gl && SKIP_GLOSS_LANG.test(gl)) {
    skipped.push(`${slug} (glossLang: ${gl})`);
    continue;
  }
  const units = segmentMarkdown(raw);
  if (!units.length) {
    skipped.push(`${slug} (немає пояснень кирилицею)`);
    continue;
  }
  pageFiles++;
  pageUnits += units.length;
  pageChars += units.reduce((n, u) => n + u.text.length, 0);
  write(path.join(OUT, 'pages', `${slug}.json`), { slug, kind: 'page', units });
}

let exFiles = 0;
let exUnits = 0;
let exChars = 0;

if (existsSync(EXERCISES)) {
  for (const f of readdirSync(EXERCISES).filter((x) => x.endsWith('.json')).sort()) {
    let obj;
    try {
      obj = JSON.parse(readFileSync(path.join(EXERCISES, f), 'utf8'));
    } catch {
      console.error(`! не розібрався JSON: ${f}`);
      continue;
    }
    const units = segmentJson(obj);
    if (!units.length) continue;
    exFiles++;
    exUnits += units.length;
    exChars += units.reduce((n, u) => n + u.text.length, 0);
    write(path.join(OUT, 'exercises', f), { file: f, kind: 'exercise', units });
  }
}

console.log('Лекції:  %d файлів, %d одиниць, %d знаків', pageFiles, pageUnits, pageChars);
console.log('Вправи:  %d файлів, %d одиниць, %d знаків', exFiles, exUnits, exChars);
console.log('Разом:   %d одиниць, %d знаків на мову', pageUnits + exUnits, pageChars + exChars);
if (skipped.length) {
  console.log('\nПропущено (%d):', skipped.length);
  for (const s of skipped) console.log('  ·', s);
}
