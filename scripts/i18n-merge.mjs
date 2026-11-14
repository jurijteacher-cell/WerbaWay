#!/usr/bin/env node
/**
 * Безпечно докладає переклади в src/content/i18n/{pages,exercises}/<file>.<loc>.json.
 * На відміну від i18n-apply.mjs нічого не видаляє: наявні ключі лишаються, додаються
 * лише відсутні. Тому його можна запускати в свіжому клоні, де _t/ порожній.
 *
 *   node scripts/i18n-extract.mjs                 # оновити _source (каталоги одиниць)
 *   # переклади → src/content/i18n/_t/<loc>/<будь-яка-назва>.json  { ключ: "переклад" }
 *   node scripts/i18n-merge.mjs                   # ru pl en
 *   node scripts/i18n-coverage.mjs <lesson_id>    # має бути ✓
 *
 * Ключ, якого немає в _t, береться з уже наявних перекладів інших лекцій (той самий
 * текст → той самий ключ), тож повторювані глоси перекладати вдруге не треба.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import path from 'path';

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'src/content/i18n/_source');
const T = path.join(ROOT, 'src/content/i18n/_t');
const OUT = path.join(ROOT, 'src/content/i18n');
const args = process.argv.slice(2).filter((x) => !x.startsWith('-'));
const LOCALES = args.length ? args : ['ru', 'pl', 'en'];

if (!existsSync(SRC)) {
  console.error('Немає _source — спершу node scripts/i18n-extract.mjs');
  process.exit(1);
}
const readJson = (f) => JSON.parse(readFileSync(f, 'utf8'));

for (const l of LOCALES) {
  const fresh = {};
  const dir = path.join(T, l);
  if (existsSync(dir)) for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) Object.assign(fresh, readJson(path.join(dir, f)));
  const known = {};
  for (const d of ['pages', 'exercises']) {
    const p = path.join(OUT, d);
    if (!existsSync(p)) continue;
    for (const f of readdirSync(p).filter((x) => x.endsWith(`.${l}.json`))) Object.assign(known, readJson(path.join(p, f)));
  }
  let files = 0;
  let added = 0;
  for (const d of ['pages', 'exercises']) {
    const p = path.join(SRC, d);
    if (!existsSync(p)) continue;
    for (const f of readdirSync(p).filter((x) => x.endsWith('.json'))) {
      const cat = readJson(path.join(p, f));
      const target = path.join(OUT, d, `${f.replace(/\.json$/, '')}.${l}.json`);
      const map = existsSync(target) ? readJson(target) : {};
      let n = 0;
      for (const u of cat.units) {
        if (map[u.key]) continue;
        const v = fresh[u.key] ?? known[u.key];
        if (typeof v === 'string' && v.trim()) {
          map[u.key] = v;
          n++;
        }
      }
      if (n) {
        writeFileSync(target, JSON.stringify(map, null, 2) + '\n', 'utf8');
        files++;
        added += n;
      }
    }
  }
  console.log(`${l}: +${added} перекладів у ${files} файлах`);
}
