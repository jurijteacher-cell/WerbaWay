#!/usr/bin/env node
/** Перевіряє, що переклад пакета має рівно ті самі ключі: node scripts/i18n-check-batch.mjs ru 001 */
import { readFileSync } from 'fs';
const [loc, n] = process.argv.slice(2);
const src = JSON.parse(readFileSync(`src/content/i18n/_batches/batch-${n}.json`, 'utf8'));
const out = JSON.parse(readFileSync(`src/content/i18n/_t/${loc}/batch-${n}.json`, 'utf8'));
const want = src.map((u) => u.key);
const missing = want.filter((k) => !(k in out));
const extra = Object.keys(out).filter((k) => !want.includes(k));
const empty = want.filter((k) => out[k] != null && String(out[k]).trim() === '');
console.log(
  `${loc}/batch-${n}: ${want.length} очікувано, ${Object.keys(out).length} отримано` +
    (missing.length ? `, БРАКУЄ ${missing.length}: ${missing.slice(0, 5).join(', ')}` : '') +
    (extra.length ? `, ЗАЙВІ ${extra.length}` : '') +
    (empty.length ? `, ПОРОЖНІ ${empty.length}` : '')
);
process.exit(missing.length || extra.length || empty.length ? 1 : 0);
