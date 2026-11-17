/**
 * Розміри фотографій під місце, де вони реально показуються.
 *
 * Обкладинки лекцій і колод лежать на Unsplash, а в контенті записані як
 * `?w=1600&q=80&fm=jpg` — це ~320 КБ на картинку (бувало й 535 КБ), хоча в
 * картці вона займає смужку 400×64. На «Словах» таких картинок 82, на «Курсі» —
 * 52, тобто сторінка тягнула 20–29 МБ, і це головна причина гальм на телефоні.
 *
 * Тут URL переписується під фактичний розмір місця і під сучасний формат:
 * `auto=format` змушує Unsplash віддати WebP/AVIF замість примусового `fm=jpg`.
 * Разом це ~30–45 КБ замість 320 КБ.
 *
 * Чужі (не-Unsplash) адреси та локальні файли повертаються без змін, тож
 * функцію безпечно вішати на будь-який `src`.
 */

const UNSPLASH = /^https?:\/\/images\.unsplash\.com\//;

/** 1–100; на фото 68 візуально не відрізняється від 80, а важить відчутно менше */
const DEFAULT_Q = 68;

/** Адреса картинки потрібного розміру. Не-Unsplash — без змін. */
export function img(src: string | null | undefined, w: number, h?: number, q = DEFAULT_Q): string {
  if (!src || !UNSPLASH.test(src)) return src ?? '';

  const [base, query = ''] = src.split('?');
  const old = new URLSearchParams(query);

  // лишаємо тільки те, що впливає на кадр; усе про розмір і формат задаємо самі
  const next = new URLSearchParams();
  next.set('w', String(Math.round(w)));
  if (h) {
    next.set('h', String(Math.round(h)));
    next.set('fit', 'crop');
    // у вихідних адресах трапляється crop=entropy — хай Unsplash сам шукає центр кадру
    next.set('crop', old.get('crop') ?? 'entropy');
  } else {
    next.set('fit', 'max');
  }
  next.set('q', String(q));
  next.set('auto', 'format');

  return `${base}?${next.toString()}`;
}

type Props = { src: string; srcSet?: string; sizes?: string };

/**
 * Готовий набір пропсів для `<img>`.
 *
 * `width`/`height` — скільки місця картинка займає у CSS-пікселях на найширшому
 * екрані (height можна не давати: тоді пропорції лишаються як в оригіналі).
 * `sizes` каже браузеру ширину місця ще до того, як дорахується CSS, щоб на
 * телефоні він не взяв десктопний варіант.
 */
export function imgProps(
  src: string | null | undefined,
  { width, height, sizes, q }: { width: number; height?: number; sizes: string; q?: number }
): Props {
  const base = img(src, width, height, q);
  if (!src || !UNSPLASH.test(src)) return { src: base };

  const ratio = height ? height / width : 0;
  const srcSet = [width, width * 2]
    .map((w) => `${img(src, w, ratio ? w * ratio : undefined, q)} ${Math.round(w)}w`)
    .join(', ');

  return { src: base, srcSet, sizes };
}
