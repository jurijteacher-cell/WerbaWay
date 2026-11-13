#!/usr/bin/env node
/**
 * Загортає кириличні рядки інтерфейсу у t().
 *
 *   node scripts/i18n-ui-codemod.mjs --dry  src/components/lesson
 *   node scripts/i18n-ui-codemod.mjs        src/components/lesson
 *
 * Серверні файли отримують `import { t } from '@/i18n/server'` — мову t() бере
 * із запиту сама. Клієнтські ('use client') — хук useT(), який вставляється на
 * початок компонента, бо в React без хука до контексту не дістатися.
 *
 * Шаблонні рядки (`...${x}...`) і складні випадки codemod не чіпає — їх видно
 * у звіті як «вручну», бо там потрібна підстановка {n}, а не переклад рядка.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import path from 'path';

const CYR = /[Ѐ-ӿ]/;
const args = process.argv.slice(2);
const dry = args.includes('--dry');
const targets = args.filter((a) => !a.startsWith('--'));

const SKIP = [
  'lib/embed-results/notion-sync.ts',
  'app/diag/route.ts',
  'content/lessons/',
  'content/lectures/',
  `${path.sep}i18n${path.sep}`,
];

function walk(p) {
  const out = [];
  if (statSync(p).isDirectory()) {
    for (const e of readdirSync(p)) out.push(...walk(path.join(p, e)));
  } else if (/\.tsx?$/.test(p) && !SKIP.some((x) => p.includes(x.split('/').join(path.sep)))) {
    out.push(p);
  }
  return out;
}

/** Межі коментарів і рядків — щоб не правити текст у комментарях. */
function commentMask(src) {
  const mask = new Uint8Array(src.length);
  let i = 0;
  while (i < src.length) {
    if (src[i] === '/' && src[i + 1] === '/') {
      while (i < src.length && src[i] !== '\n') mask[i++] = 1;
    } else if (src[i] === '/' && src[i + 1] === '*') {
      const end = src.indexOf('*/', i + 2);
      const stop = end === -1 ? src.length : end + 2;
      while (i < stop) mask[i++] = 1;
    } else i++;
  }
  return mask;
}

/**
 * Глибина вкладеності дужок у кожній позиції, поза рядками й коментарями.
 * Нуль = рівень модуля: там t() викликався б під час імпорту, коли запиту ще
 * немає, і сервер падав би. Такі літерали codemod не чіпає.
 */
function depthMap(src) {
  const d = new Int32Array(src.length);
  let depth = 0;
  let i = 0;
  let q = null;
  while (i < src.length) {
    const c = src[i];
    if (q) {
      if (c === '\\') { d[i] = depth; d[i + 1] = depth; i += 2; continue; }
      if (c === q) q = null;
    } else if (c === "'" || c === '"' || c === '`') {
      q = c;
    } else if (c === '/' && src[i + 1] === '/') {
      while (i < src.length && src[i] !== '\n') d[i++] = depth;
      continue;
    } else if (c === '/' && src[i + 1] === '*') {
      const end = src.indexOf('*/', i + 2);
      const stop = end === -1 ? src.length : end + 2;
      while (i < stop) d[i++] = depth;
      continue;
    } else if (c === '{' || c === '(') {
      depth++;
    } else if (c === '}' || c === ')') {
      depth--;
    }
    d[i] = depth;
    i++;
  }
  return d;
}

/** Вставляє рядок одразу після відкривної дужки функції-компонента, що містить позицію pos. */
function componentBodyStart(src, pos) {
  // шукаємо найближчий зліва заголовок компонента верхнього рівня
  const re = /(?:export\s+(?:default\s+)?)?(?:async\s+)?function\s+([A-Z]\w*)\s*\([\s\S]*?\)\s*(?::\s*[^{\n]+)?\{|(?:export\s+)?const\s+([A-Z]\w*)\s*(?::[^=\n]+)?=\s*(?:async\s*)?\([\s\S]*?\)\s*(?::\s*[^=>\n]+)?=>\s*\{/g;
  let best = null;
  for (const m of src.matchAll(re)) {
    if (m.index >= pos) break;
    best = m;
  }
  if (!best) return null;
  return { at: best.index + best[0].length, name: best[1] ?? best[2] };
}

let changedFiles = 0;
const manual = [];

for (const target of targets) {
  for (const file of walk(target)) {
    let src = readFileSync(file, 'utf8');
    const original = src;
    const isClient = /^\s*['"]use client['"]/.test(src);
    const mask = commentMask(src);
    const depth = depthMap(src);

    // ── 1. текст між тегами JSX
    const edits = [];
    const jsxText = /(>)([^<>{}\n]*[Ѐ-ӿ][^<>{}]*)(<)/g;
    for (const m of src.matchAll(jsxText)) {
      if (mask[m.index]) continue;
      const raw = m[2];
      const trimmed = raw.trim();
      if (!trimmed) continue;
      const lead = raw.slice(0, raw.indexOf(trimmed));
      const tail = raw.slice(raw.indexOf(trimmed) + trimmed.length);
      edits.push({
        start: m.index + 1,
        end: m.index + 1 + raw.length,
        text: `${lead}{t(${JSON.stringify(trimmed)})}${tail}`,
      });
    }

    // ── 2. рядки в атрибутах: attr="Текст" / attr='Текст'
    const attr = /(\s)([a-zA-Z-]+)=("([^"\n]*[Ѐ-ӿ][^"\n]*)"|'([^'\n]*[Ѐ-ӿ][^'\n]*)')/g;
    for (const m of src.matchAll(attr)) {
      if (mask[m.index] || depth[m.index] === 0) continue;
      const value = m[4] ?? m[5] ?? '';
      edits.push({
        start: m.index + m[1].length + m[2].length + 1,
        end: m.index + m[0].length,
        text: `{t(${JSON.stringify(value)})}`,
      });
    }

    // ── 3. звичайні рядкові літерали (label: 'Текст', throw new Error('Текст') …)
    const lit = /'([^'\\\n]*[Ѐ-ӿ][^'\\\n]*)'/g;
    for (const m of src.matchAll(lit)) {
      if (mask[m.index] || depth[m.index] === 0) continue;
      // уже всередині t(…)?
      if (/t\($/.test(src.slice(Math.max(0, m.index - 2), m.index))) continue;
      // атрибут JSX обробили вище
      const before = src.slice(Math.max(0, m.index - 40), m.index);
      if (/[a-zA-Z-]=$/.test(before)) continue;
      // імпорти та шляхи
      if (/^\s*(import|from|require)\b/m.test(before.split('\n').pop() ?? '')) continue;
      edits.push({ start: m.index, end: m.index + m[0].length, text: `t(${JSON.stringify(m[1])})` });
    }

    // шаблонні рядки — лише у звіт
    for (const m of src.matchAll(/`[^`]*[Ѐ-ӿ][^`]*`/g)) {
      if (mask[m.index]) continue;
      manual.push(`${path.relative(process.cwd(), file)}: ${m[0].slice(0, 70).replace(/\n/g, ' ')}`);
    }

    if (!edits.length) continue;

    // застосовуємо з кінця, щоб не збити позиції; відкидаємо перетини
    edits.sort((a, b) => b.start - a.start);
    let lastStart = Infinity;
    const applied = [];
    for (const e of edits) {
      if (e.end > lastStart) continue;
      applied.push(e);
      lastStart = e.start;
    }
    for (const e of applied) src = src.slice(0, e.start) + e.text + src.slice(e.end);

    // ── хук / імпорт
    const needHook = isClient;
    if (needHook) {
      const bodies = new Map();
      for (const e of [...applied].sort((a, b) => a.start - b.start)) {
        const c = componentBodyStart(src, e.start);
        if (c) bodies.set(c.at, c.name);
      }
      for (const at of [...bodies.keys()].sort((a, b) => b - a)) {
        if (/const t = useT\(\)/.test(src.slice(at, at + 200))) continue;
        src = src.slice(0, at) + '\n  const t = useT();' + src.slice(at);
      }
      if (!/from '@\/i18n\/client'/.test(src)) {
        src = src.replace(/^(\s*['"]use client['"];?\s*\n)/, `$1\nimport { useT } from '@/i18n/client';\n`);
      } else if (!/useT/.test(src.match(/import \{([^}]*)\} from '@\/i18n\/client'/)?.[1] ?? '')) {
        src = src.replace(/import \{([^}]*)\} from '@\/i18n\/client'/, (m, g) => `import {${g.replace(/\s*$/, '')}, useT } from '@/i18n/client'`);
      }
    } else if (!/from '@\/i18n\/server'/.test(src)) {
      const lines = src.split('\n');
      const last = lines.reduce((acc, l, i) => (/^import /.test(l) ? i : acc), -1);
      lines.splice(last + 1, 0, "import { t } from '@/i18n/server';");
      src = lines.join('\n');
    } else if (!/\bt\b/.test(src.match(/import \{([^}]*)\} from '@\/i18n\/server'/)?.[1] ?? '')) {
      src = src.replace(/import \{([^}]*)\} from '@\/i18n\/server'/, (m, g) => `import {${g.replace(/\s*$/, '')}, t } from '@/i18n/server'`);
    }

    if (src !== original) {
      changedFiles++;
      console.log(`${dry ? '[dry] ' : ''}${path.relative(process.cwd(), file)}  (+${applied.length})`);
      if (!dry) writeFileSync(file, src, 'utf8');
    }
  }
}

console.log(`\nФайлів змінено: ${changedFiles}`);
if (manual.length) {
  console.log(`\nВручну (шаблонні рядки, ${manual.length}):`);
  for (const m of manual.slice(0, 40)) console.log('  ·', m);
}
