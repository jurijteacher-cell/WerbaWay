#!/usr/bin/env node
/**
 * Імпорт лекцій з Notion (база «Уроки») на сайт.
 *
 *   NOTION_TOKEN=… node scripts/notion-import.mjs [--only <фрагмент назви>] [--dry]
 *
 * Пише:
 *   src/content/pages/<slug>.md          — сторінки учня (відкриваються в /learn)
 *   src/content/teacher-pages/<slug>.md  — сторінки «TEACHER · …» (лише для викладача)
 *   public/content/<slug>/n-*.{jpg,png}   — картинки, завантажені з Notion (їх посилання з Notion живуть годину)
 *   src/content/pages/_import-report.json — що імпортовано, що пропущено, які пари учень/викладач не знайшлись
 *
 * Slug = id уроку з його вправ (/embed/<id>/…) — так збігаються результати вправ, слова й прогрес.
 * Токен не зберігається в репозиторії.
 */
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const TOKEN = process.env.NOTION_TOKEN;
if (!TOKEN) {
  console.error('NOTION_TOKEN is required');
  process.exit(1);
}
const LESSONS_DB = '3d796e03c7c88091aba8cbfc95f4a896';
const MODULES_DB = '792b542d26894fc9a4319e9727496b6f';
const ROOT = process.cwd();
const args = process.argv.slice(2);
const ONLY = args.includes('--only') ? args[args.indexOf('--only') + 1].toLowerCase() : null;
const DRY = args.includes('--dry');

/* ───────────── Notion API ───────────── */
let lastCall = 0;
async function api(method, url, body) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const wait = Math.max(0, lastCall + 360 - Date.now()); // ≈3 запити/с
    if (wait) await new Promise((r) => setTimeout(r, wait));
    lastCall = Date.now();
    const r = await fetch(`https://api.notion.com/v1/${url}`, {
      method,
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (r.status === 429 || r.status >= 500) {
      const ra = Number(r.headers.get('retry-after')) || 2 ** attempt;
      await new Promise((res) => setTimeout(res, ra * 1000));
      continue;
    }
    const j = await r.json();
    if (!r.ok) throw new Error(`${method} ${url}: ${r.status} ${j.message}`);
    return j;
  }
  throw new Error(`${method} ${url}: too many retries`);
}

async function queryAll(db) {
  const out = [];
  let cursor;
  do {
    const j = await api('POST', `databases/${db}/query`, { page_size: 100, start_cursor: cursor });
    out.push(...j.results);
    cursor = j.has_more ? j.next_cursor : undefined;
  } while (cursor);
  return out;
}

async function children(id) {
  const out = [];
  let cursor;
  do {
    const j = await api('GET', `blocks/${id}/children?page_size=100${cursor ? `&start_cursor=${cursor}` : ''}`);
    out.push(...j.results);
    cursor = j.has_more ? j.next_cursor : undefined;
  } while (cursor);
  for (const b of out) {
    if (b.has_children && b.type !== 'child_page' && b.type !== 'child_database') b.children = await children(b.id);
  }
  return out;
}

/* ───────────── текст ───────────── */
const ent = (s) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*/g, '&#42;')
    .replace(/_/g, '&#95;')
    .replace(/`/g, '&#96;')
    .replace(/\[/g, '&#91;')
    .replace(/\]/g, '&#93;')
    .replace(/~/g, '&#126;')
    .replace(/\|/g, '&#124;');

function rich(rt = []) {
  return rt
    .map((t) => {
      let s = ent(t.plain_text ?? '').replace(/\n/g, '<br>');
      const a = t.annotations ?? {};
      if (t.type === 'equation') s = `<code>${s}</code>`;
      if (a.code) s = `<code>${s}</code>`;
      if (a.bold) s = `<b>${s}</b>`;
      if (a.italic) s = `<i>${s}</i>`;
      if (a.strikethrough) s = `<s>${s}</s>`;
      if (a.underline) s = `<u>${s}</u>`;
      const href = t.href && !/^https:\/\/(www\.)?notion\.so\//.test(t.href) ? t.href : null;
      if (href) s = `<a href="${href.replace(/"/g, '&quot;')}">${s}</a>`;
      return s;
    })
    .join('');
}
const plain = (rt = []) => rt.map((t) => t.plain_text ?? '').join('');
/** абзац не повинен ставати списком/заголовком через свій початок */
const guardStart = (s) => s.replace(/^(\d+)\./, '$1&#46;').replace(/^([-+#>])/, (m) => `&#${m.charCodeAt(0)};`);

/* ───────────── файли ───────────── */
const report = { pages: [], skipped: [], unpaired: [], images: 0, warnings: [] };

async function fetchFile(url, slug, base) {
  const dir = path.join(ROOT, 'public/content', slug);
  const ext = (url.split('?')[0].match(/\.(jpe?g|png|gif|webp|svg)$/i)?.[1] ?? 'jpg').toLowerCase();
  const name = `n-${base}.${ext}`;
  const file = path.join(dir, name);
  if (!DRY && !existsSync(file)) {
    const r = await fetch(url);
    if (!r.ok) {
      report.warnings.push(`${slug}: image ${r.status}`);
      return null;
    }
    mkdirSync(dir, { recursive: true });
    writeFileSync(file, Buffer.from(await r.arrayBuffer()));
    report.images++;
  }
  return `/content/${slug}/${name}`;
}
const localize = (u) => u.replace(/^https?:\/\/(werba-way\.vercel\.app|(www\.)?werbaway\.com)(?=\/)/, '');

/* ───────────── блоки → markdown ───────────── */
async function md(blocks, ctx, indent = '') {
  const out = [];
  let i = 0;
  while (i < blocks.length) {
    const b = blocks[i];
    const t = b.type;
    const v = b[t] ?? {};
    const kids = async (ind = indent + '    ') => (b.children?.length ? await md(b.children, ctx, ind) : '');

    if (t === 'bulleted_list_item' || t === 'numbered_list_item' || t === 'to_do') {
      // список — послідовність однотипних елементів
      const lines = [];
      while (i < blocks.length && blocks[i].type === t) {
        const x = blocks[i];
        const xv = x[t];
        const mark = t === 'numbered_list_item' ? '1.' : '-';
        const box = t === 'to_do' ? (xv.checked ? '☑ ' : '☐ ') : '';
        lines.push(`${indent}${mark} ${box}${rich(xv.rich_text)}`);
        if (x.children?.length) lines.push(await md(x.children, ctx, indent + '    '));
        i++;
      }
      out.push(lines.join('\n'));
      continue;
    }

    switch (t) {
      case 'paragraph': {
        const s = rich(v.rich_text);
        out.push(s ? indent + guardStart(s) : '');
        if (b.children?.length) out.push(await kids());
        break;
      }
      case 'heading_1':
      case 'heading_2':
      case 'heading_3': {
        const level = t === 'heading_3' ? '###' : '##';
        const text = plain(v.rich_text).trim();
        if (v.is_toggleable && b.children?.length) {
          out.push(`<details class="lp-toggle"><summary><b>${ent(text)}</b></summary>\n\n${await md(b.children, ctx, '')}\n\n</details>`);
        } else out.push(`${level} ${text}`);
        break;
      }
      case 'quote':
        out.push(`> ${rich(v.rich_text)}${b.children?.length ? '\n>\n' + (await kids('')).replace(/^/gm, '> ') : ''}`);
        break;
      case 'callout': {
        const icon = v.icon?.type === 'emoji' ? v.icon.emoji : '';
        const tone = (v.color ?? 'default').replace('_background', '');
        const body = [guardStart(rich(v.rich_text)), b.children?.length ? await md(b.children, ctx, '') : ''].filter(Boolean).join('\n\n');
        out.push(
          `<aside class="lp-callout" data-tone="${tone}"><span class="lp-callout-icon" aria-hidden="true">${icon}</span><div class="lp-callout-body">\n\n${body}\n\n</div></aside>`
        );
        break;
      }
      case 'toggle':
        out.push(`<details class="lp-toggle"><summary>${rich(v.rich_text)}</summary>\n\n${b.children?.length ? await md(b.children, ctx, '') : ''}\n\n</details>`);
        break;
      case 'divider':
        out.push('---');
        break;
      case 'code':
        out.push('```' + (v.language ?? '') + '\n' + plain(v.rich_text) + '\n```');
        break;
      case 'equation':
        out.push(`<code>${ent(v.expression ?? '')}</code>`);
        break;
      case 'image': {
        const caption = plain(v.caption).replace(/[\[\]]/g, '');
        let src = v.type === 'external' ? localize(v.external.url) : await fetchFile(v.file.url, ctx.slug, b.id.slice(0, 8));
        if (src) out.push(`${indent}![${caption}](${src})`);
        break;
      }
      case 'embed': {
        let url = v.url ?? '';
        // Quizlet не використовуємо: замість нього наша колода слів цього уроку (якщо вона є)
        if (/quizlet\.com/.test(url)) {
          const deck = ctx.lessonId && existsSync(path.join(ROOT, 'src/content/queue-published', `${ctx.lessonId}-vocab.json`));
          if (!deck) {
            report.warnings.push(`${ctx.slug}: Quizlet removed (no own deck)`);
            break;
          }
          out.push(`<embed source="/embed/${ctx.lessonId}/vocab">\nSłownictwo — fiszki\n</embed>`);
          break;
        }
        const cap = plain(v.caption) || ctx.embedName(url);
        out.push(`<embed source="${url}">\n${cap}\n</embed>`);
        break;
      }
      case 'video': {
        const url = v.type === 'external' ? v.external.url : null;
        if (url && /youtu/.test(url)) out.push(`<video source="${url}">\n${plain(v.caption) || 'Wideo'}\n</video>`);
        else report.warnings.push(`${ctx.slug}: video skipped (${v.type})`);
        break;
      }
      case 'audio': {
        const url = v.type === 'external' ? v.external.url : await fetchFile(v.file.url, ctx.slug, b.id.slice(0, 8));
        if (url) out.push(`<audio controls preload="none" src="${url}"></audio>`);
        break;
      }
      case 'bookmark':
      case 'link_preview':
        if (v.url) out.push(`[${plain(v.caption) || v.url}](${v.url})`);
        break;
      case 'table': {
        const rows = (b.children ?? []).filter((r) => r.type === 'table_row').map((r) => r.table_row.cells.map((c) => rich(c) || ' '));
        if (rows.length) {
          const w = Math.max(...rows.map((r) => r.length));
          const fix = (r) => [...r, ...Array(w - r.length).fill(' ')];
          const lines = [`| ${fix(rows[0]).join(' | ')} |`, `|${' --- |'.repeat(w)}`, ...rows.slice(1).map((r) => `| ${fix(r).join(' | ')} |`)];
          out.push(lines.join('\n'));
        }
        break;
      }
      case 'column_list':
      case 'column':
      case 'synced_block':
        if (b.children?.length) out.push(await md(b.children, ctx, indent));
        break;
      case 'child_page':
      case 'child_database':
      case 'link_to_page':
      case 'table_of_contents':
      case 'breadcrumb':
        break;
      case 'file':
      case 'pdf': {
        const url = v.type === 'external' ? v.external.url : null;
        if (url) out.push(`[${plain(v.caption) || 'Plik'}](${url})`);
        else report.warnings.push(`${ctx.slug}: ${t} skipped (uploaded file)`);
        break;
      }
      default:
        report.warnings.push(`${ctx.slug}: unsupported block ${t}`);
    }
    i++;
  }
  return out.join('\n\n').replace(/\n{3,}/g, '\n\n');
}

/* ───────────── сторінки ───────────── */
const slugify = (s) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ł/g, 'l')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

const EMBED_NAMES = {
  grammar: 'Ćwiczenia gramatyczne',
  exam: 'Jak na egzaminie',
  'comm-tasks': 'Zadania komunikacyjne',
  slides: 'Slajdy',
  hw: 'Praca domowa',
  vocab: 'Słownictwo — fiszki',
  notes: 'Notatki',
  pictures: 'Obrazki',
  'grammar-board': 'Gramatyka',
  'mock-exam': 'Egzamin próbny',
  placement: 'Test poziomujący',
};

function lessonIdOf(blocks) {
  const stack = [...blocks];
  while (stack.length) {
    const b = stack.shift();
    const url = b.type === 'embed' ? b.embed.url : '';
    const m = url.match(/\/embed\/([a-z0-9][a-z0-9-]*)\//);
    if (m) return m[1];
    if (b.children) stack.push(...b.children);
  }
  return null;
}

const cleanTitle = (s) => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const teacherBase = (s) =>
  cleanTitle(s)
    .replace(/^teacher\s*·\s*/i, '')
    .replace(/\s*\((A0|A1|A2|B1|B2)\)\s*$/i, '')
    .toLowerCase();

async function main() {
  const modules = await queryAll(MODULES_DB);
  const modById = new Map(
    modules.map((m) => [
      m.id.replace(/-/g, ''),
      {
        code: (m.properties['Код']?.rich_text ?? []).map((t) => t.plain_text).join('') || null,
        name: cleanTitle(plain(m.properties.Name?.title)),
      },
    ])
  );
  const rows = await queryAll(LESSONS_DB);
  console.log(`lessons in Notion: ${rows.length}`);

  const items = [];
  for (const r of rows) {
    const p = r.properties;
    const name = cleanTitle(plain(p.Name?.title));
    if (!name || /usuń|\bTEST\b/i.test(name)) {
      report.skipped.push({ name, why: 'test/empty' });
      continue;
    }
    if (ONLY && !name.toLowerCase().includes(ONLY)) continue;
    const type = p['Тип']?.select?.name ?? null;
    const teacher = type === 'Викладач' || /^teacher\b/i.test(name);
    const modIds = (p['Модуль']?.relation ?? []).map((x) => x.id.replace(/-/g, ''));
    const mod = modIds.map((id) => modById.get(id)).find(Boolean) ?? null;
    items.push({
      id: r.id,
      url: r.url,
      name,
      teacher,
      level: p['Рівень']?.select?.name ?? null,
      number: p['№ у курсі']?.number ?? null,
      mod,
      icon: r.icon?.type === 'emoji' ? r.icon.emoji : null,
      cover: r.cover ? (r.cover.type === 'external' ? r.cover.external.url : r.cover.file.url) : null,
      coverIsFile: r.cover?.type === 'file',
    });
  }

  // зміст
  const extra = [];
  for (const [n, it] of items.entries()) {
    process.stdout.write(`[${n + 1}/${items.length}] ${it.name.slice(0, 60)} … `);
    try {
      it.blocks = await children(it.id);
      // старі уроки-обгортки: справжній зміст у вкладених сторінках «Student page» / «Tutor SCRIPT»
      const subs = it.blocks.filter((b) => b.type === 'child_page');
      const isTut = (b) => /tutor|teacher|script|викладач|nauczyciel/i.test(b.child_page.title);
      const tut = subs.find(isTut);
      const stu = subs.find((b) => /student|uczeń|учн/i.test(b.child_page.title)) ?? (tut ? subs.find((b) => !isTut(b)) : undefined);
      if (!it.teacher && (stu || tut)) {
        if (tut) extra.push({ ...it, teacher: true, wrapperOf: it, name: `TEACHER · ${it.name}`, blocks: await children(tut.id) });
        if (stu) it.blocks = await children(stu.id);
        else it.failed = true; // лише сценарій — учневі нічого показувати
      }
      it.lessonId = lessonIdOf(it.blocks);
      console.log(`${it.blocks.length} blocks${it.lessonId ? ' · ' + it.lessonId : ''}`);
    } catch (e) {
      console.log('ERROR ' + e.message);
      report.skipped.push({ name: it.name, why: e.message });
      it.failed = true;
    }
  }

  // slug: id уроку з вправ, інакше модуль + назва; сторінка викладача бере slug своєї пари
  const used = new Set();
  for (const e of extra) e.lessonId = lessonIdOf(e.blocks);
  items.push(...extra);
  const students = items.filter((x) => !x.teacher && !x.failed);
  const teachers = items.filter((x) => x.teacher && !x.failed);
  for (const s of students) {
    const fromName = slugify(s.name);
    let slug = s.lessonId ?? (fromName ? slugify(`${s.mod?.code ?? 'pl'}-${s.name}`) : `${s.mod?.code ?? 'pl'}-${s.id.replace(/-/g, '').slice(0, 8)}`);
    if (used.has(slug)) slug = `${slug}-${slugify(s.name).slice(0, 20)}`;
    used.add(slug);
    s.slug = slug;
  }
  for (const t of teachers) {
    const pair =
      (t.wrapperOf && !t.wrapperOf.failed ? t.wrapperOf : null) ||
      (t.lessonId && students.find((s) => s.lessonId === t.lessonId)) ||
      students.find((s) => s.mod?.code === t.mod?.code && teacherBase(s.name) === teacherBase(t.name)) ||
      students.find((s) => s.mod?.code === t.mod?.code && teacherBase(s.name).startsWith(teacherBase(t.name).split(':')[0]));
    t.slug = pair?.slug ?? `teacher-${slugify(`${t.mod?.code ?? 'pl'}-${teacherBase(t.name)}`)}`;
    t.pair = pair?.slug ?? null;
    if (!pair) report.unpaired.push({ teacher: t.name, module: t.mod?.name ?? null });
  }

  const fm = (o) =>
    '---\n' +
    Object.entries(o)
      .filter(([, v]) => v != null && v !== '')
      .map(([k, v]) => `${k}: ${String(v).replace(/\n/g, ' ')}`)
      .join('\n') +
    '\n---\n\n';

  for (const it of [...students, ...teachers]) {
    const ctx = { slug: it.slug, lessonId: it.lessonId ?? it.pair ?? null, embedName: (u) => EMBED_NAMES[u.match(/\/embed\/[^/]+\/([a-z-]+)/)?.[1]] ?? 'Ćwiczenie' };
    const body = await md(it.blocks, ctx);
    let cover = it.cover;
    if (cover && it.coverIsFile) cover = await fetchFile(cover, it.slug, 'cover');
    else if (cover) cover = localize(cover);
    const head = fm({
      title: it.teacher ? cleanTitle(it.name).replace(/^teacher\s*·\s*/i, '') : it.name,
      icon: it.icon,
      level: it.level,
      number: it.number,
      module: it.mod?.code,
      moduleTitle: it.mod?.name,
      cover,
      notion: it.url,
      teacherOf: it.teacher ? it.pair : null,
    });
    const dir = path.join(ROOT, 'src/content', it.teacher ? 'teacher-pages' : 'pages');
    if (!DRY) {
      mkdirSync(dir, { recursive: true });
      writeFileSync(path.join(dir, `${it.slug}.md`), head + body + '\n');
    }
    report.pages.push({ slug: it.slug, teacher: it.teacher, name: it.name, module: it.mod?.code ?? null, blocks: it.blocks.length });
  }

  if (!DRY) writeFileSync(path.join(ROOT, 'src/content/pages/_import-report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(
    `\nstudent pages: ${students.length}, teacher pages: ${teachers.length}, images: ${report.images}, unpaired teacher pages: ${report.unpaired.length}, warnings: ${report.warnings.length}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
