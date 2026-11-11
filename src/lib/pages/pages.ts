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
  cover?: string;
  notion?: string;
};

export type EmbedKind = 'exam' | 'comm-tasks' | 'slides' | 'grammar' | 'hw' | 'vocab' | 'quizlet' | 'other';

export type PageBlock =
  | { k: 'html'; html: string }
  | { k: 'embed'; src: string; title: string; kind: EmbedKind }
  | { k: 'video'; id: string; title: string };

export type ParsedPage = {
  meta: PageMeta;
  /** «Po tej lekcji potrafisz» — усе до першого ---, показується окремою карткою */
  goal: string | null;
  blocks: PageBlock[];
  toc: { id: string; label: string }[];
};

const DIR = path.join(process.cwd(), 'src/content/pages');
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
  if (k === 'slides' || k === 'exam' || k === 'comm-tasks' || k === 'grammar' || k === 'hw' || k === 'vocab') return k;
  return 'other';
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
      return `<h${depth} id="${slugify(plain)}">${text}</h${depth}>\n`;
    },
    image(href: string, _title: string | null, text: string) {
      const alt = (text ?? '').replace(/"/g, '&quot;');
      return `<figure class="lp-fig"><img src="${href}" alt="${alt}" loading="lazy" /></figure>`;
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
    cover: data.cover,
    notion: data.notion,
  };

  // «Po tej lekcji potrafisz» — все до першого ---
  let goal: string | null = null;
  let rest = body.trimStart();
  const hr = rest.search(/^---\s*$/m);
  if (hr > 0 && /potrafisz/i.test(rest.slice(0, hr))) {
    goal = marked.parse(rest.slice(0, hr)) as string;
    rest = rest.slice(hr).replace(/^---\s*\n/, '');
  }

  const blocks: PageBlock[] = [];
  const re = /<embed\s+source="([^"]+)"\s*>\s*([\s\S]*?)\s*<\/embed>|<video\s+source="([^"]+)"\s*>\s*([\s\S]*?)\s*<\/video>/g;
  let last = 0;
  let m: RegExpExecArray | null;
  const pushMd = (md: string) => {
    if (md.trim()) blocks.push({ k: 'html', html: marked.parse(md) as string });
  };
  while ((m = re.exec(rest))) {
    pushMd(rest.slice(last, m.index));
    if (m[1]) {
      blocks.push({ k: 'embed', src: localize(m[1]), title: m[2], kind: embedKind(m[1]) });
    } else {
      const id = youtubeId(m[3]);
      if (id) blocks.push({ k: 'video', id, title: m[4] });
    }
    last = m.index + m[0].length;
  }
  pushMd(rest.slice(last));

  const toc: { id: string; label: string }[] = [];
  for (const line of rest.split('\n')) {
    const h = line.match(/^##\s+(.+?)\s*$/);
    if (h) toc.push({ id: slugify(h[1].replace(/<[^>]+>/g, '')), label: h[1] });
  }

  return { meta, goal, blocks, toc };
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
