#!/usr/bin/env node
/**
 * Розкладає перекладені пакети по файлах:
 *   src/content/i18n/pages/<slug>.<locale>.json
 *   src/content/i18n/exercises/<file>.<locale>.json
 * у вигляді { ключ: "переклад" } — рівно ті ключі, що є в цьому файлі.
 *
 *   node scripts/i18n-apply.mjs           # усі мови
 *   node scripts/i18n-apply.mjs ru pl     # лише вибрані
 *
 * Чого немає в перекладі — просто лишається мовою джерела: сайт не ламається,
 * максимум показує неперекладену глосу.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, rmSync } from 'fs';
import path from 'path';

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'src/content/i18n/_source');
const T = path.join(ROOT, 'src/content/i18n/_t');
const OUT = path.join(ROOT, 'src/content/i18n');

const locales = process.argv.slice(2).filter((x) => !x.startsWith('-'));
const wanted = locales.length ? locales : ['ru', 'pl', 'en'];

function loadLocale(locale) {
  const dir = path.join(T, locale);
  if (!existsSync(dir)) return null;
  const map = {};
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
    const raw = readFileSync(path.join(dir, f), 'utf8').trim();
    if (!raw) continue;
    let obj;
    try {
      obj = JSON.parse(raw);
    } catch (e) {
      console.error(`! ${locale}/${f}: не розібрався JSON — ${e.message}`);
      continue;
    }
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === 'string' && v.trim()) map[k] = v;
    }
  }
  return map;
}

for (const locale of wanted) {
  const map = loadLocale(locale);
  if (!map) {
    console.log(`${locale}: перекладів ще немає`);
    continue;
  }
  let files = 0;
  let have = 0;
  let want = 0;

  for (const [dir, outDir] of [
    ['pages', path.join(OUT, 'pages')],
    ['exercises', path.join(OUT, 'exercises')],
  ]) {
    const d = path.join(SRC, dir);
    if (!existsSync(d)) continue;
    mkdirSync(outDir, { recursive: true });
    for (const f of readdirSync(d).filter((x) => x.endsWith('.json'))) {
      const cat = JSON.parse(readFileSync(path.join(d, f), 'utf8'));
      const base = f.replace(/\.json$/, '');
      const out = {};
      for (const u of cat.units) {
        want++;
        if (map[u.key]) {
          out[u.key] = map[u.key];
          have++;
        }
      }
      const target = path.join(outDir, `${base}.${locale}.json`);
      if (Object.keys(out).length) {
        writeFileSync(target, JSON.stringify(out, null, 2) + '\n', 'utf8');
        files++;
      } else if (existsSync(target)) {
        rmSync(target);
      }
    }
  }
  const pct = want ? Math.round((have / want) * 100) : 0;
  console.log(`${locale}: ${files} файлів, покриття ${have}/${want} (${pct}%)`);
}
