#!/usr/bin/env node
/**
 * Повне видалення лекцій із репо — другий крок кошика (/teacher/trash → «Видалити назавжди»).
 *
 *   node scripts/purge-lectures.mjs --from-site            # список із https://werba-way.vercel.app/api/lectures/purged
 *   node scripts/purge-lectures.mjs pl-a1-01-wczoraj ...    # вручну, за slug-ами
 *   ... --dry-run                                           # лише показати, що буде видалено
 *
 * Запускає GitHub Action .github/workflows/purge-lectures.yml і сам комітить результат.
 *
 * Що видаляється для лекції <slug>:
 *   • src/content/pages/<slug>.md, src/content/teacher-pages/<slug>.md, переклади сторінки;
 *   • усе, що належить її вправам (lesson_id з <embed …/embed/<id>/…> і /slides/<id>):
 *     JSON вправ і їх переклади, слайди, аудіо, картинки public/content/<id>/, копії в content-queue/;
 *   • копії сторінки в content-queue/lectures і content-queue/teacher.
 * Вправа, яку вставлено ще в якусь лекцію, лишається. Файл належить тому id, який є найдовшим
 * префіксом його назви (pl-…-pies-ru-hw.json належить pl-…-pies-ru, а не pl-…-pies).
 */
import { existsSync, readdirSync, readFileSync, rmSync, statSync } from 'fs';
import path from 'path';

const ROOT = process.cwd();
const SITE = process.env.PURGE_SITE_URL || 'https://werba-way.vercel.app';
const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;
const args = process.argv.slice(2);
const dry = args.includes('--dry-run');
const fromSite = args.includes('--from-site');

const PAGES = 'src/content/pages';
const TEACHER = 'src/content/teacher-pages';

/** Файли самої сторінки лекції: ідуть разом із нею, навіть коли її вправи спільні */
const PAGE_ROOTS = ['src/content/i18n/pages', 'content-queue/lectures', 'content-queue/teacher'];

/** Де шукати файли вправ і ресурсів (рекурсивно) */
const ASSET_ROOTS = [
  'src/content/queue-published',
  'src/content/i18n/exercises',
  'content-queue/exercises',
  'content-queue/slides',
  'public/content',
  'public/slides',
  'public/audio',
  'public/standalone',
];

const rel = (p) => path.relative(ROOT, p);
const mdFiles = (dir) =>
  existsSync(path.join(ROOT, dir)) ? readdirSync(path.join(ROOT, dir)).filter((f) => f.endsWith('.md')).map((f) => f.slice(0, -3)) : [];

/** lesson_id вправ, вставлених у лекцію */
function embedIds(file) {
  if (!existsSync(file)) return new Set();
  const raw = readFileSync(file, 'utf8');
  const out = new Set();
  for (const m of raw.matchAll(/\/embed\/([a-z0-9][a-z0-9-]*)\//g)) out.add(m[1]);
  for (const m of raw.matchAll(/\/slides\/([a-z0-9][a-z0-9-]*)/g)) out.add(m[1]);
  return out;
}

async function slugsFromSite() {
  const r = await fetch(`${SITE}/api/lectures/purged`, { headers: { 'cache-control': 'no-cache' } });
  if (!r.ok) throw new Error(`${SITE}/api/lectures/purged → HTTP ${r.status}`);
  const d = await r.json();
  return Array.isArray(d.slugs) ? d.slugs : [];
}

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    out.push(full);
    if (statSync(full).isDirectory()) walk(full, out);
  }
  return out;
}

/** Назва файлу/теки належить id, якщо це сам id або id + «-», «.», «_» далі */
const belongs = (name, id) => name === id || (name.startsWith(id) && /^[-._]/.test(name.slice(id.length)));

async function main() {
  const requested = (fromSite ? await slugsFromSite() : args.filter((a) => !a.startsWith('--'))).filter((s) => {
    const ok = typeof s === 'string' && SLUG_RE.test(s);
    if (!ok) console.warn(`пропускаю неправильний slug: ${JSON.stringify(s)}`);
    return ok;
  });
  const allPages = mdFiles(PAGES);
  const allTeacher = mdFiles(TEACHER);
  const targets = requested.filter((s) => allPages.includes(s) || allTeacher.includes(s));
  if (!targets.length) {
    console.log(requested.length ? 'Файлів цих лекцій уже немає — нічого робити.' : 'Немає лекцій для видалення.');
    return;
  }

  // усі відомі id: slug-и лекцій і lesson_id усіх вставлених вправ
  const known = new Set([...allPages, ...allTeacher]);
  const used = new Map(); // id → лекції, що його вставляють
  for (const [dir, list] of [
    [PAGES, allPages],
    [TEACHER, allTeacher],
  ]) {
    for (const slug of list) {
      for (const id of embedIds(path.join(ROOT, dir, `${slug}.md`))) {
        known.add(id);
        if (!used.has(id)) used.set(id, new Set());
        used.get(id).add(slug);
      }
    }
  }

  // і lesson_id з самих JSON вправ та назви лекцій у черзі — щоб чужий файл зі схожою назвою
  // (…-pies-ru-hw.json поруч із …-pies) не приписати лекції, що видаляється
  for (const root of ['src/content/queue-published', 'content-queue']) {
    for (const full of walk(path.join(ROOT, root))) {
      const name = path.basename(full);
      if (name.endsWith('.json')) {
        try {
          const id = JSON.parse(readFileSync(full, 'utf8'))?.lesson_id;
          if (typeof id === 'string' && SLUG_RE.test(id)) known.add(id);
        } catch {
          /* не JSON вправи */
        }
      } else if (name.endsWith('.md') && full.includes(`${path.sep}lectures${path.sep}`)) known.add(name.replace(/(\.(notion|resolved))?\.md$/, ''));
    }
  }

  const gone = new Set(targets);
  const drop = new Set(targets);
  for (const slug of targets) {
    for (const dir of [PAGES, TEACHER]) for (const id of embedIds(path.join(ROOT, dir, `${slug}.md`))) drop.add(id);
  }
  // вправа ще живе в іншій лекції — лишаємо
  const kept = [];
  for (const id of [...drop]) {
    const others = [...(used.get(id) ?? [])].filter((s) => !gone.has(s));
    if (others.length) {
      drop.delete(id);
      kept.push(`${id} (ще в ${others.join(', ')})`);
    }
  }
  const ids = [...known].sort((a, b) => b.length - a.length);
  const owner = (name) => ids.find((id) => belongs(name, id));

  const remove = new Set();
  for (const slug of targets) {
    for (const dir of [PAGES, TEACHER]) {
      const f = path.join(ROOT, dir, `${slug}.md`);
      if (existsSync(f)) remove.add(f);
    }
  }
  for (const root of PAGE_ROOTS) {
    for (const full of walk(path.join(ROOT, root))) {
      const o = owner(path.basename(full));
      if (o && (gone.has(o) || drop.has(o))) remove.add(full);
    }
  }
  for (const root of ASSET_ROOTS) {
    for (const full of walk(path.join(ROOT, root))) {
      const o = owner(path.basename(full));
      if (o && drop.has(o)) remove.add(full);
    }
  }
  // тека, що вже йде під видалення, забирає все всередині
  const list = [...remove].sort();
  const final = list.filter((f) => !list.some((d) => d !== f && f.startsWith(d + path.sep)));

  console.log(`Лекції: ${targets.join(', ')}`);
  if (kept.length) console.log(`Лишаю спільні вправи: ${kept.join('; ')}`);
  for (const f of final) {
    console.log(`${dry ? '[dry] ' : ''}rm ${rel(f)}`);
    if (!dry) rmSync(f, { recursive: true, force: true });
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
