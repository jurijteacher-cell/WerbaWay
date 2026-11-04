#!/usr/bin/env node
/**
 * Guard: components rendered inside /embed/* sit on the LIGHT notebook theme.
 * Dark site tokens (text-paper, bg-ink*, border-ink*, text-gold*, bg-gold…) make
 * text invisible there (cream text on white tiles — bug 2026-11-04, «Ułóż zdanie»).
 *
 * Walks the import graph from every src/app/embed/** page and fails if any reached
 * component uses a dark token. Runs before `next build` (prebuild).
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import path from 'path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SRC = path.join(ROOT, 'src');
const DARK = /\b(?:text|bg|border|ring|placeholder)-(?:paper|ink|gold)(?:-[a-z]+)?(?:\/\d+)?\b|#(?:15130f|211f19|1c1a15|34302a|e2b34f|f2ede1|a89d88|f0c968)\b/gi;

function walk(dir, out = []) {
  for (const f of readdirSync(dir)) {
    const p = path.join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx|ts)$/.test(f)) out.push(p);
  }
  return out;
}

function resolveImport(from, spec) {
  let base;
  if (spec.startsWith('@/')) base = path.join(SRC, spec.slice(2));
  else if (spec.startsWith('.')) base = path.resolve(path.dirname(from), spec);
  else return null;
  for (const ext of ['', '.tsx', '.ts', '/index.tsx', '/index.ts']) {
    const p = base + ext;
    if (existsSync(p) && statSync(p).isFile()) return p;
  }
  return null;
}

const seen = new Set();
const queue = walk(path.join(SRC, 'app', 'embed'));
while (queue.length) {
  const f = queue.pop();
  if (seen.has(f)) continue;
  seen.add(f);
  const src = readFileSync(f, 'utf8');
  for (const m of src.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
    const r = resolveImport(f, m[1]);
    if (r && r.includes(`${path.sep}components${path.sep}`)) queue.push(r);
  }
}

const problems = [];
for (const f of seen) {
  readFileSync(f, 'utf8')
    .split('\n')
    .forEach((line, i) => {
      if (line.trim().startsWith('*') || line.trim().startsWith('//')) return;
      const hits = line.match(DARK);
      if (hits) problems.push(`${path.relative(ROOT, f)}:${i + 1}  ${[...new Set(hits)].join(', ')}`);
    });
}

if (problems.length) {
  console.error('\n✗ Dark-theme tokens in embed (light notebook) components:\n');
  for (const p of problems) console.error('  ' + p);
  console.error('\n  Use nb-* classes / --nb-* variables (notebook.css, docs/STYLE_NOTEBOOK.md).\n');
  process.exit(1);
}
console.log(`✓ embed theme: ${seen.size} files checked, no dark tokens`);
