/**
 * Werba Way — смоук-перевірка лекції на сайті (SITE_PUBLISHING §10).
 *
 * Те, що раніше перевірялося очима: лекція відкривається, гортається до кінця,
 * кожне вікно вправи монтується й рахує відповідь, текст у вікні читабельний
 * (не кремовий по білому), на сторінці учня немає службового тексту.
 *
 * Запуск (потрібен піднятий сайт — npm run dev або vercel preview):
 *   LESSON=pl-a2-53-z-kim-pracuje npx playwright test tests/lesson-site.spec.ts
 *
 *   BASE=http://localhost:3000            адреса сайту (типова)
 *   STUDENT_EMAIL / STUDENT_PASSWORD      акаунт із доступом до лекції — без них
 *                                         перевіряються лише вікна вправ (вони відкриті,
 *                                         бо живуть в iframe Notion)
 *
 * Селектори — контракт UI: .lp-turn-next, .lp-sheet, .lp-embed iframe,
 * [data-role="check"], [data-item-id], [data-state]. Якщо селектор зник —
 * це зміна контракту: онови і тест, і SITE_PUBLISHING, а не просто вимкни перевірку.
 */
import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const SLUG = process.env.LESSON ?? '';
const BASE = (process.env.BASE ?? 'http://localhost:3000').replace(/\/$/, '');
const EMAIL = process.env.STUDENT_EMAIL ?? '';
const PASSWORD = process.env.STUDENT_PASSWORD ?? '';

const PAGE_FILE = path.join(process.cwd(), 'src/content/pages', `${SLUG}.md`);
/** пробний іспит і тест poziomujący тягнуть завдання з API під акаунтом — без нього перевіряємо лише, що сторінка жива */
const ACCOUNT_ONLY = ['/mock-exam', '/placement'];
const MAX_PAGES = 60; // запобіжник від вічного гортання

test.describe.configure({ mode: 'serial' });
test.skip(!SLUG, 'задай LESSON=<slug>');

function source(): string {
  if (!fs.existsSync(PAGE_FILE)) throw new Error(`немає ${PAGE_FILE} — лекції на сайті нема (SITE_PUBLISHING §2)`);
  return fs.readFileSync(PAGE_FILE, 'utf8');
}

/** адреси вікон вправ так, як вони стоять у лекції */
function embedUrls(): string[] {
  const out = new Set<string>();
  for (const m of source().matchAll(/<embed\s+source="([^"]+)"/g)) {
    const rel = m[1].replace(/^https?:\/\/(werba-way\.vercel\.app|(www\.)?werbaway\.com)/, '');
    if (rel.startsWith('/embed/')) out.add(BASE + rel);
  }
  return [...out];
}

async function login(page: Page) {
  await page.goto(`${BASE}/login`);
  await page.locator('input[type="email"]').fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20_000 });
}

/**
 * Найчастіший брак вікна — текст кольору, близького до тла (кремовий по білому,
 * баг 2026-11-04). Рахуємо контраст кожного видимого тексту до найближчого
 * непрозорого тла; нижче 2.0 людина не читає.
 */
async function lowContrast(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const lum = (c: string) => {
      const m = c.match(/[\d.]+/g);
      if (!m) return null;
      const [r, g, b, a = 1] = m.map(Number);
      if (a < 0.9) return null;
      const f = (v: number) => {
        const x = v / 255;
        return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
      };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const bg = (el: Element): number | null => {
      let node: Element | null = el;
      while (node) {
        const l = lum(getComputedStyle(node).backgroundColor);
        if (l !== null) return l;
        node = node.parentElement;
      }
      return 1; // далі — біле тло сторінки
    };
    const bad: string[] = [];
    for (const el of Array.from(document.querySelectorAll('body *'))) {
      const own = Array.from(el.childNodes)
        .filter((n) => n.nodeType === 3)
        .map((n) => n.textContent?.trim() ?? '')
        .join(' ')
        .trim();
      if (own.length < 2) continue;
      const style = getComputedStyle(el);
      if (style.visibility === 'hidden' || style.display === 'none' || Number(style.opacity) < 0.5) continue;
      const r = (el as HTMLElement).getBoundingClientRect();
      if (r.width < 4 || r.height < 4) continue;
      const fg = lum(style.color);
      const back = bg(el);
      if (fg === null || back === null) continue;
      const ratio = (Math.max(fg, back) + 0.05) / (Math.min(fg, back) + 0.05);
      if (ratio < 2) bad.push(`${ratio.toFixed(2)}:1 · ${style.color} на тлі · «${own.slice(0, 40)}»`);
    }
    return bad.slice(0, 10);
  });
}

test('у лекції є всі вікна вправ', () => {
  const urls = embedUrls();
  expect(urls.length, 'у лекції немає жодного вікна вправи — вправи мають бути інтерактивні').toBeGreaterThan(0);
});

test('лекція відкривається й гортається до кінця', async ({ page }) => {
  test.skip(!EMAIL || !PASSWORD, 'задай STUDENT_EMAIL / STUDENT_PASSWORD');
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await login(page);
  await page.goto(`${BASE}/learn/${SLUG}`);
  await expect(page.locator('.lp-sheet').first(), 'лекція не відкрилася (доступ? slug?)').toBeVisible({ timeout: 15_000 });

  const title = source().match(/^title:\s*(.+)$/m)?.[1]?.trim();
  if (title) await expect(page.locator('h1, .lp-hero h1').first()).toContainText(title.replace(/^\d+\s*·\s*/, ''));

  // службового тексту на сторінці учня бути не може
  const body = (await page.locator('.lp-pager-main').innerText()).toLowerCase();
  for (const junk of ['todo', '[exercise', '[image', '[slides', 'zdjęcie wkrótce', 'teacher ·']) {
    expect(body, `на сторінці учня службовий текст «${junk}»`).not.toContain(junk);
  }

  // гортаємо «Далі» до кінця лекції
  let seen = 0;
  for (; seen < MAX_PAGES; seen++) {
    await expect(page.locator('.lp-sheet.is-current, .lp-sheet').first()).toBeVisible();
    const next = page.locator('button.lp-turn-next');
    if (!(await next.count()) || !(await next.first().isEnabled())) break;
    await next.first().click();
    await page.waitForTimeout(250); // анімація перегортання
  }
  expect(seen, 'лекція не гортається').toBeGreaterThan(0);
  expect(seen, `зупинилося на ${MAX_PAGES} сторінках — схоже на цикл`).toBeLessThan(MAX_PAGES);
  expect(errors, `помилки JS у лекції: ${errors.join(' · ')}`).toHaveLength(0);

  const frames = await page.locator('.lp-embed iframe').count();
  expect(frames + seen, 'у лекції не видно жодного вікна вправи').toBeGreaterThan(0);
});

test('кожне вікно вправи монтується, рахує відповідь і читабельне', async ({ page }) => {
  for (const url of embedUrls()) {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(url);

    const accountOnly = ACCOUNT_ONLY.some((x) => url.includes(x));
    if (accountOnly) {
      // екран іспиту піднімається під акаунтом; тут перевіряємо, що сторінка віддається без помилки
      await expect(page.locator('.nb-sheet, .mx-panel, .nb-note').first(), `${url}: сторінка іспиту не відкрилась`).toBeVisible({
        timeout: 15_000,
      });
      expect(errors, `${url}: помилки JS: ${errors.join(' · ')}`).toHaveLength(0);
      continue;
    }

    const mounted = page.locator('[data-item-id], [data-role="check"], [data-slide-id]');
    await expect(mounted.first(), `${url}: вікно порожнє — немає JSON або вправа не змонтувалась`).toBeVisible({
      timeout: 15_000,
    });

    // відповідаємо в першому завданні: або є «Sprawdź», або вправа рахує одразу (іспитові блоки)
    const item = page.locator('[data-item-id]').first();
    const option = item.locator('[data-role="option"], [data-role="bank-word"]').first();
    const input = item.locator('[data-role="answer-input"]').first();
    const check = page.locator('[data-role="check"]');
    const answered = (await option.count()) > 0 || (await input.count()) > 0;
    if (answered) {
      if (await option.count()) await option.first().click();
      else await input.fill('zzz');
      if (await check.count()) await check.first().click();
      await expect(
        page.locator('[data-item-id]:not([data-state="pending"])').first(),
        `${url}: відповідь не зарахувалась — перевірка вправи не працює`
      ).toBeVisible({ timeout: 10_000 });
    }

    const bad = await lowContrast(page);
    expect(bad, `${url}: невидимий текст (темні токени в embed — nb-* only):\n${bad.join('\n')}`).toHaveLength(0);
    expect(errors, `${url}: помилки JS: ${errors.join(' · ')}`).toHaveLength(0);
  }
});
