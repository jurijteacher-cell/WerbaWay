/**
 * Док-чат: викладач ↔ учень (docs/CLASS_TOOLS_SPEC.md §1.5).
 * Потрібні два реальні акаунти (тест не створює їх сам):
 *   BASE_URL=http://localhost:3000 TEACHER_EMAIL=… TEACHER_PASSWORD=… STUDENT_EMAIL=… STUDENT_PASSWORD=… STUDENT_ID=<profiles.id учня>
 *   npx playwright test tests/dock-chat.spec.ts
 * Без змінних тест пропускається. Падає на будь-якій помилці JS (pageerror).
 */
import { test, expect, type Browser, type Page } from '@playwright/test';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const { TEACHER_EMAIL, TEACHER_PASSWORD, STUDENT_EMAIL, STUDENT_PASSWORD, STUDENT_ID } = process.env;
const ready = !!(TEACHER_EMAIL && TEACHER_PASSWORD && STUDENT_EMAIL && STUDENT_PASSWORD && STUDENT_ID);

async function login(page: Page, email: string, password: string) {
  await page.goto(`${BASE}/login`);
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20_000 });
}

async function session(browser: Browser, email: string, password: string, errors: string[]) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  await login(page, email, password);
  return page;
}

async function openDock(page: Page) {
  const panel = page.getByRole('complementary', { name: /.+/ });
  if (!(await panel.isVisible().catch(() => false))) await page.getByTestId('dock-open').click();
  await expect(page.locator('.ww-dock')).toBeVisible();
}

test.skip(!ready, 'потрібні TEACHER_*/STUDENT_* і STUDENT_ID');

test('учень і викладач обмінюються повідомленнями; історія переживає перезавантаження', async ({ browser }) => {
  const errors: string[] = [];
  const stu = await session(browser, STUDENT_EMAIL!, STUDENT_PASSWORD!, errors);
  const tch = await session(browser, TEACHER_EMAIL!, TEACHER_PASSWORD!, errors);

  await stu.goto(`${BASE}/words`);
  await tch.goto(`${BASE}/teacher/students/${STUDENT_ID}/watch?dock=1`);
  await openDock(stu);
  await openDock(tch);

  const q = `Dzień dobry ${Date.now()}`;
  await stu.locator('.ww-dock-input').fill(q);
  await stu.keyboard.press('Enter');
  await expect(tch.locator('.ww-dock-msg', { hasText: q })).toBeVisible({ timeout: 5_000 });
  // час є, чипа лекції немає (учень на /words)
  await expect(tch.locator('.ww-dock-msg', { hasText: q }).locator('time')).toHaveText(/\d{1,2}:\d{2}/);
  await expect(tch.locator('.ww-dock-lessonchip')).toHaveCount(0);

  const a = `Cześć! ${Date.now()}`;
  await tch.locator('.ww-dock-input').fill(a);
  await tch.keyboard.press('Enter');
  await expect(stu.locator('.ww-dock-msg', { hasText: a })).toBeVisible({ timeout: 5_000 });

  await stu.reload();
  await openDock(stu);
  await expect(stu.locator('.ww-dock-msg', { hasText: q })).toHaveCount(1);
  await expect(stu.locator('.ww-dock-msg', { hasText: a })).toHaveCount(1);

  expect(errors, errors.join('\n')).toEqual([]);
});

test('на вузькому екрані — аркуш, нічого не вилазить за край', async ({ browser }) => {
  const errors: string[] = [];
  const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  await login(page, STUDENT_EMAIL!, STUDENT_PASSWORD!);
  await page.goto(`${BASE}/words`);
  await page.getByTestId('dock-open').click();
  const sheet = page.locator('.ww-dock.is-sheet');
  await expect(sheet).toBeVisible();
  const box = await sheet.boundingBox();
  expect(box!.width).toBeLessThanOrEqual(390);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.keyboard.press('Escape');
  await expect(sheet).toHaveCount(0);
  expect(errors, errors.join('\n')).toEqual([]);
});
