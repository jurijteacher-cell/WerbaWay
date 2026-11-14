#!/usr/bin/env node
/**
 * Зводить усі одиниці перекладу в один каталог із дедуплікацією:
 * однакова глоса в різних лекціях перекладається один раз.
 *   node scripts/i18n-catalog.mjs [--batch N] [--out dir]
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync, rmSync } from 'fs';
import path from 'path';

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'src/content/i18n/_source');
const OUT = path.join(ROOT, 'src/content/i18n/_batches');
const BATCH_CHARS = Number(process.argv[process.argv.indexOf('--batch') + 1]) || 7000;

const units = new Map();
for (const dir of ['pages', 'exercises']) {
  const d = path.join(SRC, dir);
  if (!existsSync(d)) continue;
  for (const f of readdirSync(d).filter((x) => x.endsWith('.json'))) {
    const cat = JSON.parse(readFileSync(path.join(d, f), 'utf8'));
    for (const u of cat.units) {
      const prev = units.get(u.key);
      if (prev) {
        prev.where.add(cat.slug ?? cat.file);
        if (!prev.context && u.context) prev.context = u.context;
        continue;
      }
      units.set(u.key, {
        key: u.key,
        text: u.text,
        kind: u.kind,
        field: u.field ?? '',
        context: u.context ?? '',
        where: new Set([cat.slug ?? cat.file]),
      });
    }
  }
}

const all = [...units.values()].sort((a, b) => a.key.localeCompare(b.key));
const chars = all.reduce((n, u) => n + u.text.length, 0);

mkdirSync(OUT, { recursive: true });
for (const f of readdirSync(OUT)) if (f.endsWith('.json')) rmSync(path.join(OUT, f));
let batch = [];
let size = 0;
let n = 0;
const flush = () => {
  if (!batch.length) return;
  n++;
  writeFileSync(
    path.join(OUT, `batch-${String(n).padStart(3, '0')}.json`),
    JSON.stringify(
      batch.map((u) => ({ key: u.key, kind: u.kind, field: u.field, context: u.context, text: u.text })),
      null,
      2
    ) + '\n',
    'utf8'
  );
  batch = [];
  size = 0;
};
for (const u of all) {
  batch.push(u);
  size += u.text.length + (u.context?.length ?? 0);
  if (size >= BATCH_CHARS) flush();
}
flush();

console.log('Унікальних одиниць: %d (%d знаків) → %d пакетів', all.length, chars, n);
