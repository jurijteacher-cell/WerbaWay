import { existsSync, readdirSync, readFileSync } from 'fs';
import path from 'path';
import { Marked } from 'marked';

/**
 * Сторінки-лекції, перенесені з Notion: src/content/pages/<slug>.md
 * (Notion-markdown із <embed>/<video> + YAML-шапка). Контент лежить у репо й довіряється
 * (HTML не санітизується) — не підставляти сюди текст від учнів.
 */

export type PageMeta = {
  slug: string;
  title: string;
  icon?: string;
  level?: string;
  number?: number;
  module?: string;
  /** людська назва курсу (як у Notion) */
  moduleTitle?: string;
  cover?: string;
  notion?: string;
  /** сторінка викладача: slug учнівської лекції, до якої вона належить */
  teacherOf?: string;
};

export type EmbedKind =
  | 'exam'
  | 'comm-tasks'
  | 'slides'
  | 'grammar'
  | 'grammar-board'
  | 'hw'
  | 'vocab'
  | 'notes'
  | 'pictures'
  | 'mock-exam'
  | 'placement'
  | 'quizlet'
  | 'other';

export type PageBlock =
  | { k: 'html'; html: string }
  | { k: 'embed'; src: string; title: string; kind: EmbedKind }
  | { k: 'video'; id: string; title: string };

export type PageSection = {
  id: string;
  label: string;
  /** homework = «Praca domowa» (окрема сторінка /hw); lecture = решта */
  kind: 'lecture' | 'homework';
  blocks: PageBlock[];
};

export type ParsedPage = {
  meta: PageMeta;
  /** «Po tej lekcji potrafisz» — усе до першого ---, показується окремою карткою */
  goal: string | null;
  sections: PageSection[];
  /** змістом лекції є лише lecture-секції */
  toc: { id: string; label: string; num: string | null }[];
  hasHomework: boolean;
};

/** Крок заняття в класі: або текст розділу, або одна вправа */
export type ClassStep = {
  key: string;
  section: string;
  label: string;
  kind: 'goal' | 'text' | EmbedKind | 'video';
  /** шлях сайту, який вантажиться в iframe класу (без ?class=1) */
  url: string;
};

const HOMEWORK_RE = /praca\s+domowa|домашн|homework/i;

/** «1. Czytanie», «📖 1. Czytanie» → { num: '1', title: '📖 Czytanie' } */
export function splitNumbered(label: string): { num: string | null; title: string } {
  const m = label.match(/^((?:\p{Extended_Pictographic}|\uFE0F|\u200D)+\s*)?(\d+)\.\s+([\s\S]+)$/u);
  if (!m) return { num: null, title: label };
  return { num: m[2], title: `${m[1] ? m[1].trim() + ' ' : ''}${m[3]}` };
}

const DIR = path.join(process.cwd(), 'src/content/pages');
const TEACHER_DIR = path.join(process.cwd(), 'src/content/teacher-pages');
const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ł/g, 'l')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseFrontmatter(raw: string): { data: Record<string, string>; body: string } {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { data: {}, body: raw };
  const data: Record<string, string> = {};
  for (const line of m[1].split('\n')) {
    const i = line.indexOf(':');
    if (i > 0) data[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return { data, body: raw.slice(m[0].length) };
}

function embedKind(src: string): EmbedKind {
  if (src.includes('quizlet.com')) return 'quizlet';
  const m = src.match(/\/embed\/[^/]+\/([a-z-]+)/) || src.match(/\/slides\//);
  if (src.includes('/slides/')) return 'slides';
  const k = m?.[1];
  const known: EmbedKind[] = ['slides', 'exam', 'comm-tasks', 'grammar', 'grammar-board', 'hw', 'vocab', 'notes', 'pictures', 'mock-exam', 'placement'];
  return known.includes(k as EmbedKind) ? (k as EmbedKind) : 'other';
}

/** Наші вправи лежать на цьому ж сайті: https://werba-way.vercel.app/embed/… → /embed/… */
function localize(src: string): string {
  return src.replace(/^https?:\/\/(werba-way\.vercel\.app|(www\.)?werbaway\.com)(?=\/)/, '');
}

function youtubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/);
  return m ? m[1] : null;
}

const marked = new Marked({ gfm: true });
marked.use({
  renderer: {
    heading(text: string, depth: number) {
      const plain = text.replace(/<[^>]+>/g, '');
      // «1. Czytanie» — розділи лекції йдуть по черзі: номер виноситься в кружечок
      const sp = depth === 2 ? splitNumbered(text) : { num: null, title: text };
      const inner = sp.num ? `<span class="lp-num" aria-hidden="true">${sp.num}</span><span>${sp.title}</span>` : text;
      return `<h${depth} id="${slugify(plain)}">${inner}</h${depth}>\n`;
    },
    image(href: string, _title: string | null, text: string) {
      const alt = (text ?? '').replace(/"/g, '&quot;');
      return `<img class="lp-img" src="${href}" alt="${alt}" loading="lazy" />`;
    },
    link(href: string, _title: string | null | undefined, text: string) {
      const ext = /^https?:\/\//.test(href);
      return `<a href="${href}"${ext ? ' target="_blank" rel="noopener noreferrer"' : ''}>${text}</a>`;
    },
  },
});

export function parsePage(slug: string, raw: string): ParsedPage {
  const { data, body } = parseFrontmatter(raw);
  const meta: PageMeta = {
    slug,
    title: data.title || slug,
    icon: data.icon,
    level: data.level,
    number: data.number ? Number(data.number) : undefined,
    module: data.module,
    moduleTitle: data.moduleTitle,
    cover: data.cover,
    notion: data.notion,
    teacherOf: data.teacherOf,
  };

  // «Po tej lekcji potrafisz» — все до першого ---
  let goal: string | null = null;
  let rest = body.trimStart();
  const hr = rest.search(/^---\s*$/m);
  if (hr > 0 && /potrafisz/i.test(rest.slice(0, hr))) {
    goal = marked.parse(rest.slice(0, hr)) as string;
    rest = rest.slice(hr).replace(/^---\s*\n/, '');
  }

  // секції за заголовками «## …»
  const parts = rest.split(/^(?=##\s)/m).filter((x) => x.trim());
  const sections: PageSection[] = parts.map((part) => {
    const h = part.match(/^##\s+(.+?)\s*$/m);
    const label = h ? h[1].replace(/<[^>]+>/g, '') : '';
    return {
      id: slugify(label) || 'intro',
      label,
      kind: HOMEWORK_RE.test(label) ? 'homework' : 'lecture',
      blocks: parseBlocks(part),
    };
  });

  const toc = sections
    .filter((x) => x.kind === 'lecture' && x.label)
    .map((x) => {
      const sp = splitNumbered(x.label);
      return { id: x.id, label: sp.title, num: sp.num };
    });
  return { meta, goal, sections, toc, hasHomework: sections.some((x) => x.kind === 'homework') };
}

function parseBlocks(md: string): PageBlock[] {
  const blocks: PageBlock[] = [];
  const re = /<embed\s+source="([^"]+)"\s*>\s*([\s\S]*?)\s*<\/embed>|<video\s+source="([^"]+)"\s*>\s*([\s\S]*?)\s*<\/video>/g;
  let last = 0;
  let m: RegExpExecArray | null;
  const pushMd = (x: string) => {
    // «---» між розділами — це лише роздільник: на сторінці його малює CSS
    const t = x.replace(/^\s*---\s*$/gm, '');
    if (t.trim()) blocks.push({ k: 'html', html: marked.parse(t) as string });
  };
  while ((m = re.exec(md))) {
    pushMd(md.slice(last, m.index));
    if (m[1]) blocks.push({ k: 'embed', src: localize(m[1]), title: m[2], kind: embedKind(m[1]) });
    else {
      const id = youtubeId(m[3]);
      if (id) blocks.push({ k: 'video', id, title: m[4] });
    }
    last = m.index + m[0].length;
  }
  pushMd(md.slice(last));
  return blocks;
}

/**
 * Сторінка «блокнота». Лекція гортається сторінками: вступний текст розділу + вправа = одна сторінка,
 * текст без вправи — окрема сторінка. Ці самі сторінки — кроки заняття в класі.
 */
export type BookPage = {
  key: string;
  /** назва розділу без номера */
  section: string;
  /** номер розділу («1»…), null для Słowniczek / Źródła / цілей */
  num: string | null;
  /** підпис у навігації: «Текст» або назва вправи */
  label: string;
  kind: 'goal' | 'text' | EmbedKind | 'video';
  /** що відкривати в iframe класу: текст — /learn/…?step=, вправа — сам embed (так його видно викладачеві) */
  url: string;
  blocks: PageBlock[];
};

const isLocalEmbed = (b: PageBlock) => b.k === 'embed' && !/^https?:/.test(b.src);
const hasContent = (bs: PageBlock[]) =>
  bs.some((b) => b.k !== 'html' || b.html.replace(/<[^>]+>/g, '').trim().length > 0);

export function buildPages(page: ParsedPage): BookPage[] {
  const base = `/learn/${page.meta.slug}`;
  const out: BookPage[] = [];
  if (page.goal) {
    out.push({
      key: 'goal',
      section: 'Po tej lekcji potrafisz',
      num: null,
      label: 'Cele lekcji',
      kind: 'goal',
      url: `${base}?step=goal`,
      // заголовок і 🎯 малює сама сторінка
      blocks: [
        {
          k: 'html',
          html: page.goal.replace(/<p>\s*<b>[^<]*potrafisz[^<]*<\/b>\s*<\/p>\s*/i, '').replace(/🎯\s*/g, ''),
        },
      ],
    });
  }
  for (const sec of page.sections) {
    if (sec.kind !== 'lecture') continue;
    // текст до першого заголовка (пробні іспити, короткі сторінки) — сторінка з назвою уроку
    const label = sec.label || page.meta.title;
    const sp = sec.label ? splitNumbered(label) : { num: null, title: label };
    const num = sp.num;
    const title = sp.title;
    // заголовок розділу малює сама сторінка — з тексту його прибираємо
    const blocks = sec.blocks
      .map((b) => (b.k === 'html' ? { ...b, html: b.html.replace(/<h2\b[^>]*>[\s\S]*?<\/h2>\s*/g, '') } : b))
      .filter((b) => b.k !== 'html' || b.html.trim());
    let buf: PageBlock[] = [];
    let i = 0;
    for (const b of blocks) {
      if (isLocalEmbed(b) && b.k === 'embed') {
        const key = `${sec.id}~${i++}`;
        out.push({ key, section: title, num, label: b.title, kind: b.kind, url: b.src, blocks: [...buf, b] });
        buf = [];
      } else buf.push(b);
    }
    if (hasContent(buf)) {
      const key = `${sec.id}~${i++}`;
      out.push({
        key,
        section: title,
        num,
        label: buf.some((b) => b.k === 'video') ? 'Текст і відео' : 'Текст',
        kind: 'text',
        url: `${base}?step=${encodeURIComponent(key)}`,
        blocks: buf,
      });
    }
  }
  return out;
}

/** Кроки заняття в класі = сторінки лекції */
export function buildSteps(page: ParsedPage): ClassStep[] {
  return buildPages(page).map(({ key, section, num, label, kind, url }) => ({
    key,
    section: num ? `${num}. ${section}` : section,
    label,
    kind,
    url,
  }));
}

export function listPages(): PageMeta[] {
  if (!existsSync(DIR)) return [];
  return readdirSync(DIR)
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const slug = f.replace(/\.md$/, '');
      return parsePage(slug, readFileSync(path.join(DIR, f), 'utf8')).meta;
    })
    .sort((a, b) => (a.number ?? 1e9) - (b.number ?? 1e9) || a.title.localeCompare(b.title, 'pl'));
}

export function loadPage(slug: string): ParsedPage | null {
  if (!SLUG_RE.test(slug)) return null;
  const file = path.join(DIR, `${slug}.md`);
  if (!existsSync(file)) return null;
  return parsePage(slug, readFileSync(file, 'utf8'));
}

/** Сторінка «TEACHER · …» до лекції (лише для викладача) — файл з тим самим slug */
export function loadTeacherPage(slug: string): ParsedPage | null {
  if (!SLUG_RE.test(slug)) return null;
  const file = path.join(TEACHER_DIR, `${slug}.md`);
  if (!existsSync(file)) return null;
  return parsePage(slug, readFileSync(file, 'utf8'));
}

export function listTeacherPages(): PageMeta[] {
  if (!existsSync(TEACHER_DIR)) return [];
  return readdirSync(TEACHER_DIR)
    .filter((f) => f.endsWith('.md'))
    .map((f) => parsePage(f.replace(/\.md$/, ''), readFileSync(path.join(TEACHER_DIR, f), 'utf8')).meta);
}
