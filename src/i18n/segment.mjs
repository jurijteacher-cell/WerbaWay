/**
 * Сегментатор пояснень. Один і той самий код використовують і скрипт витягу,
 * і рендер — інакше ключі перекладу розійшлися б і підстановка перестала б працювати.
 *
 * Правило просте: тіло лекції польською (цільова мова) не чіпаємо ніколи.
 * Перекладу підлягає лише те, що написано кирилицею, — глоси, пояснення, підписи.
 * Для сторінок із англійськими поясненнями (`glossLang: en` у шапці) правила інші,
 * тому такі сторінки сегментатор свідомо пропускає (див. SKIP_GLOSS_LANG).
 */

const CYR = /[Ѐ-ӿ]/;

/** FNV-1a — без node:crypto, щоб той самий код працював і в скрипті, і в рендері. */
export function unitKey(text) {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 + c + i, 0x85ebca6b) >>> 0;
  }
  return (h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0')).slice(0, 12);
}

export function hasCyrillic(s) {
  return CYR.test(s);
}

/** Мови пояснень, які це правило не ловить (там пояснення латиницею) — їх не чіпаємо. */
export const SKIP_GLOSS_LANG = /^(en|ru-latin)$/;

function frontmatterSplit(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { head: '', body: raw };
  return { head: m[0], body: raw.slice(m[0].length) };
}

/** Чи оголошено на сторінці іншу мову пояснень (тоді кирилиці там і не буде). */
export function pageGlossLang(raw) {
  const { head } = frontmatterSplit(raw);
  const m = head.match(/^glossLang:\s*(\S+)\s*$/m);
  return m ? m[1] : null;
}

/**
 * Обходить markdown і віддає кожну одиницю перекладу у fn.
 * fn(text, meta) → рядок-заміна або undefined (лишити як є).
 * Повертає зібраний текст.
 */
export function walkMarkdown(raw, fn) {
  const { head, body } = frontmatterSplit(raw);

  // ── шапка: перекладаємо лише значення з кирилицею (moduleTitle тощо)
  const newHead = head.replace(/^([A-Za-z_][\w-]*):[ \t]*(.+)$/gm, (full, key, value) => {
    if (!CYR.test(value)) return full;
    const out = fn(value, { kind: 'meta', field: key, context: '' });
    return out == null ? full : `${key}: ${out}`;
  });

  const lines = body.split('\n');
  let inFence = false;
  const outLines = lines.map((line) => {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      return line;
    }
    if (inFence) return line;

    // назва вправи/відео всередині тега — перекладаємо лише текст, тег лишається
    const tag = line.match(/^(\s*<(embed|video)\s+source="[^"]*"\s*>)([\s\S]*?)(<\/\2>\s*)$/);
    if (tag) {
      if (!CYR.test(tag[3])) return line;
      const out = fn(tag[3], { kind: 'embed-title', context: '' });
      return out == null ? line : `${tag[1]}${out}${tag[4]}`;
    }

    // рядок таблиці — одиницею є комірка, а не весь рядок: глоси живуть саме в комірках
    if (/^\s*\|/.test(line)) {
      const parts = line.split('|');
      const cells = parts.map((p) => p.trim()).filter((p, i) => i > 0 && i < parts.length - 1);
      let changed = false;
      const next = parts.map((part, i) => {
        if (i === 0 || i === parts.length - 1) return part;
        if (!CYR.test(part)) return part;
        const context = cells.filter((c) => c !== part.trim()).join(' | ');
        const out = fn(part.trim(), { kind: 'cell', context });
        if (out == null) return part;
        changed = true;
        return ` ${out} `;
      });
      return changed ? next.join('|') : line;
    }

    if (!CYR.test(line)) return line;
    const out = fn(line.trim(), { kind: 'line', context: '' });
    if (out == null) return line;
    return line.replace(line.trim(), out);
  });

  return newHead + outLines.join('\n');
}

/** Усі одиниці перекладу сторінки: [{ key, text, kind, context }] */
export function segmentMarkdown(raw) {
  const units = [];
  const seen = new Set();
  walkMarkdown(raw, (text, meta) => {
    const key = unitKey(text);
    if (!seen.has(key)) {
      seen.add(key);
      units.push({ key, text, ...meta });
    }
    return undefined;
  });
  return units;
}

/** Підставляє переклади: map = { [key]: 'переклад' }. Чого немає — лишається як у джерелі. */
export function applyMarkdown(raw, map) {
  if (!map) return raw;
  return walkMarkdown(raw, (text) => map[unitKey(text)]);
}

// ─────────────────────────── вправи (JSON) ───────────────────────────

/** Ключі, значення яких ніколи не перекладаються (id, типи, шляхи, аудіо). */
const JSON_SKIP_KEYS = new Set([
  'id',
  'lesson_id',
  'exercise_type',
  'type',
  'kind',
  'slug',
  'audio',
  'audio_url',
  'src',
  'image',
  'images',
  'url',
  'href',
  'answer',
  'answers',
  'correct',
  'correct_answer',
  'accept',
  'group',
  'groups',
  'part_of_speech',
  'layout',
  'voice',
  'level',
  'module',
]);

/**
 * Обходить розібраний JSON вправи. fn(text, meta) → заміна або undefined.
 * Перекладаємо лише рядки з кирилицею: польські інструкції й матеріал лишаються.
 */
export function walkJson(node, fn, path = [], root = null) {
  const top = root ?? node;
  if (typeof node === 'string') {
    if (!CYR.test(node)) return node;
    const field = path[path.length - 1];
    const parentPath = path.slice(0, -1);
    const parent = parentPath.reduce((acc, k) => (acc == null ? acc : acc[k]), top);
    const context =
      parent && typeof parent === 'object'
        ? Object.entries(parent)
            .filter(([k, v]) => k !== field && typeof v === 'string' && v && !CYR.test(v))
            .map(([k, v]) => `${k}: ${v}`)
            .join(' · ')
        : '';
    const out = fn(node, { kind: 'json', field: String(field ?? ''), path: path.join('.'), context });
    return out == null ? node : out;
  }
  if (Array.isArray(node)) return node.map((v, i) => walkJson(v, fn, [...path, String(i)], top));
  if (node && typeof node === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(node)) {
      out[k] = JSON_SKIP_KEYS.has(k) ? v : walkJson(v, fn, [...path, k], top);
    }
    return out;
  }
  return node;
}

export function segmentJson(obj) {
  const units = [];
  const seen = new Set();
  walkJson(obj, (text, meta) => {
    const key = unitKey(text);
    if (!seen.has(key)) {
      seen.add(key);
      units.push({ key, text, ...meta });
    }
    return undefined;
  });
  return units;
}

export function applyJson(obj, map) {
  if (!map) return obj;
  return walkJson(obj, (text) => map[unitKey(text)]);
}
