/**
 * Дошка (docs/CLASS_TOOLS_SPEC.md §3.7): викладач створює стікер і тягне, учень-глядач бачить ту саму позицію (±2 px).
 *   BASE_URL=… TEACHER_EMAIL=… TEACHER_PASSWORD=… STUDENT_EMAIL=… STUDENT_PASSWORD=… STUDENT_ID=<profiles.id учня>
 *   npx playwright test tests/board.spec.ts
 * Без змінних пропускається. Падає на pageerror.
 */
import { test, expect, type Browser, type Page } from '@playwright/test';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const { TEACHER_EMAIL, TEACHER_PASSWORD, STUDENT_EMAIL, STUDENT_PASSWORD, STUDENT_ID } = process.env;
const ready = !!(TEACHER_EMAIL && TEACHER_PASSWORD && STUDENT_EMAIL && STUDENT_PASSWORD && STUDENT_ID);
test.skip(!ready, 'потрібні TEACHER_*/STUDENT_* і STUDENT_ID');

async function session(browser: Browser, email: string, password: string, errors: string[]): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${BASE}/login`);
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20_000 });
  return page;
}

test('стікер викладача з’являється й рухається в учня-глядача', async ({ browser }) => {
  const errors: string[] = [];
  const stu = await session(browser, STUDENT_EMAIL!, STUDENT_PASSWORD!, errors);
  const tch = await session(browser, TEACHER_EMAIL!, TEACHER_PASSWORD!, errors);
  await stu.goto(`${BASE}/words`);

  await tch.goto(`${BASE}/teacher/board?add=${STUDENT_ID}`);
  await expect(stu.getByTestId('student-board')).toBeVisible({ timeout: 15_000 });

  await tch.getByTestId('board-add-note').click();
  await tch.keyboard.type('Dzień dobry');
  await tch.locator('.ww-board-stage').click({ position: { x: 5, y: 5 } }); // вийти з вводу
  const note = tch.locator('[data-el]', { hasText: 'Dzień dobry' });
  await expect(stu.locator('[data-el]', { hasText: 'Dzień dobry' })).toBeVisible({ timeout: 5_000 });

  const b = (await note.boundingBox())!;
  await tch.mouse.move(b.x + 20, b.y + 20);
  await tch.mouse.down();
  await tch.mouse.move(b.x + 120, b.y + 80, { steps: 8 });
  await tch.mouse.up();
  await tch.waitForTimeout(800);
  const t1 = await tch.locator('[data-el]', { hasText: 'Dzień dobry' }).evaluate((e) => (e as HTMLElement).style.transform);
  const s1 = await stu.locator('[data-el]', { hasText: 'Dzień dobry' }).evaluate((e) => (e as HTMLElement).style.transform);
  expect(s1).toBe(t1);

  // F5 учня — дошка та сама
  await stu.reload();
  await stu.getByTestId('board-chip').click();
  await expect(stu.locator('[data-el]', { hasText: 'Dzień dobry' })).toBeVisible();
  expect(errors, errors.join('\n')).toEqual([]);
});
