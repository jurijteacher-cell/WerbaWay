/**
 * Werba Way — e2e-перевірка уроку: кожен елемент кожної вправи натиснутий у UI.
 *
 * Тест читає JSON уроку й проходить ВСІ елементи: спершу неправильна відповідь
 * (має підсвітитися й не заблокувати), потім правильна (має зарахуватися),
 * потім перевіряє explanation. Окремим проходом перевіряє всі accept[].
 *
 * Запуск:
 *   LESSON_DIR=content-queue/lectures/incoming/pl-exam-01-pasje \
 *   LESSON_URL=http://localhost:3000/lessons/pl-exam-01-pasje \
 *   SLIDES_URL=http://localhost:3000/slides/pl-exam-01-pasje \
 *   npx playwright test tests/lesson-exercises.spec.ts --reporter=line
 *
 * Тест спирається на DOM-контракт з CURSOR_TASK (data-атрибути). Якщо атрибута
 * немає — це помилка компонента, а не тесту: додай атрибут, тест не чіпай.
 */
import { test, expect, Page, Locator } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const DIR = process.env.LESSON_DIR!;
const URL = process.env.LESSON_URL!;
const SLIDES_URL = process.env.SLIDES_URL!;
const ID = path.basename(DIR);

test.describe.configure({ mode: 'serial' });
test.setTimeout(60_000);

function load(kind: string): any | null {
  const p = path.join(DIR, `${ID}-${kind}.json`);
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null;
}

function stripDiacritics(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l').replace(/Ł/g, 'L');
}

const WRONG_TEXT = 'zzz';
const okState = /^(correct|correct-no-diacritics)$/;

async function openBlock(page: Page, blockId: string) {
  const block = page.locator(`[data-block-id="${blockId}"]`);
  if (!(await block.isVisible())) {
    await page.locator(`[data-role="tab"][data-target-block="${blockId}"]`).first().click();
  }
  await expect(block, `блок ${blockId} не відкрився`).toBeVisible({ timeout: 5_000 });
  return block;
}

function item(scope: Locator, id: string) {
  return scope.locator(`[data-item-id="${id}"]`);
}

async function check(it: Locator) {
  const own = it.locator('[data-role="check"]');
  if (await own.count()) await own.first().click();
  else await it.locator('xpath=ancestor::*[@data-block-id][1]').locator('[data-role="check"]').first().click();
}

async function expectState(it: Locator, re: RegExp, msg: string) {
  await expect(it, msg).toHaveAttribute('data-state', re, { timeout: 3_000 });
}

async function typeAnswer(it: Locator, value: string) {
  const input = it.locator('[data-role="answer-input"]').first();
  await input.fill('');
  await input.fill(value);
  await check(it);
}

async function choose(it: Locator, role: string, value: string) {
  await it.locator(`[data-role="${role}"][data-value="${value}"]`).first().click();
}

async function solveBlock(page: Page, block: any, useAccept = false) {
  const scope = await openBlock(page, block.block_id);
  const et = block.exercise_type;
  for (const x of block.items) {
    const it = item(scope, x.id);
    await expect(it, `${x.id}: елемент не відрендерено`).toBeVisible();
    const tag = `${block.block_id} ${x.id}`;

    if (et === 'fill-in-blank' && x.options) {
      // дубль кнопок options (відомий баг): кнопки елемента = його options з JSON
      const rendered = await it.locator('[data-role="option"]').evaluateAll(els => els.map(e => e.getAttribute('data-value')));
      expect(rendered.sort(), `${tag}: options на екрані ≠ options у JSON`).toEqual([...x.options].sort());
      const wrong = x.options.find((o: string) => o !== x.answer);
      await choose(it, 'option', wrong);
      await expectState(it, /^wrong$/, `${tag}: неправильний варіант не підсвітився`);
      await choose(it, 'option', x.answer);
      await expectState(it, okState, `${tag}: правильний варіант не зараховано`);
    } else if (et === 'fill-in-blank' || et === 'sentence-building') {
      const target = useAccept ? (x.accept?.[0] ?? x.answer) : x.answer;
      await typeAnswer(it, WRONG_TEXT);
      await expectState(it, /^wrong$/, `${tag}: неправильна відповідь не підсвітилася`);
      await typeAnswer(it, target);
      await expectState(it, okState, `${tag}: «${target}» не зараховано`);
    } else if (et === 'multiple-choice') {
      const rendered = await it.locator('[data-role="option"]').evaluateAll(els => els.map(e => e.getAttribute('data-value')));
      expect(rendered.sort(), `${tag}: options на екрані ≠ JSON`).toEqual([...x.options].sort());
      const wrong = x.options.find((o: string) => o !== x.answer);
      await choose(it, 'option', wrong);
      await expectState(it, /^wrong$/, `${tag}: неправильний варіант не підсвітився`);
      await expect(it.locator(`[data-role="option"][data-value="${wrong}"]`), `${tag}: неправильний варіант зник`).toBeVisible();
      await choose(it, 'option', x.answer);
      await expectState(it, okState, `${tag}: правильний варіант не зараховано`);
    } else if (et === 'true-false') {
      await choose(it, 'tf', String(!x.answer));
      await expectState(it, /^wrong$/, `${tag}: неправильний штамп не підсвітився`);
      await choose(it, 'tf', String(x.answer));
      await expectState(it, okState, `${tag}: правильний штамп не зараховано`);
    } else if (et === 'matching') {
      await choose(it, 'match-left', x.left);
      await choose(scope, 'match-right', x.right);
      await expectState(it, okState, `${tag}: пару не зараховано`);
    } else if (et === 'drag-and-drop') {
      // клік-фолбек: слово з банку → слот
      await scope.locator(`[data-role="bank-word"][data-value="${x.answer}"]:not([data-used="true"])`).first().click();
      await it.locator('[data-role="slot"]').first().click();
      await expectState(it, okState, `${tag}: слово не стало в слот або не зараховано`);
    }

    if (x.explanation) {
      await expect(it.locator('[data-role="explanation"]'), `${tag}: explanation не з'явився`).toBeVisible();
      await expect(it.locator('[data-role="explanation"]')).toContainText(x.explanation.slice(0, 15));
    }
  }
  if (et === 'drag-and-drop') {
    const left = await scope.locator('[data-role="bank-word"]:not([data-used="true"])').count();
    expect(left, `${block.block_id}: у банку мають лишитися зайві слова`).toBe(block.bank.length - block.items.length);
  }
}

for (const kind of ['grammar', 'exam', 'hw']) {
  const data = load(kind);
  if (!data) continue;
  for (const block of data.blocks) {
    test(`${kind} ${block.block_id}: усі елементи, правильні й неправильні відповіді`, async ({ page }) => {
      await page.goto(URL);
      await solveBlock(page, block);
    });
    const hasAccept = block.items.some((x: any) => x.accept?.length);
    if (hasAccept) {
      test(`${kind} ${block.block_id}: accept[] зараховуються`, async ({ page }) => {
        await page.goto(URL);
        await solveBlock(page, { ...block, items: block.items.filter((x: any) => x.accept?.length) }, true);
      });
    }
  }
}

test('lenient: відповідь без огонків — зелена з підказкою', async ({ page }) => {
  const g = load('grammar');
  const block = g.blocks.find((b: any) => b.exercise_type === 'fill-in-blank' && b.items.some((x: any) => !x.options && stripDiacritics(x.answer) !== x.answer));
  test.skip(!block, 'немає підходящого елемента');
  const x = block.items.find((y: any) => !y.options && stripDiacritics(y.answer) !== y.answer);
  await page.goto(URL);
  const scope = await openBlock(page, block.block_id);
  const it = item(scope, x.id);
  await typeAnswer(it, stripDiacritics(x.answer));
  await expectState(it, /^correct-no-diacritics$/, `${x.id}: без огонків має бути correct-no-diacritics`);
});

test('аудіо: max_plays рахується, кнопка гасне, але не зникає', async ({ page }) => {
  const exam = load('exam');
  const block = exam?.blocks.find((b: any) => b.max_plays);
  test.skip(!block, 'немає аудіо з max_plays');
  await page.goto(URL);
  const scope = await openBlock(page, block.block_id);
  const it = block.audio_mode === 'per-item' ? item(scope, block.items[0].id) : scope;
  const play = it.locator('[data-role="audio-play"]').first();
  await expect(play).toHaveAttribute('data-plays-left', String(block.max_plays));
  for (let i = block.max_plays - 1; i >= 0; i--) {
    await play.click();
    await page.waitForTimeout(300);
    await page.evaluate(() => document.querySelectorAll('audio').forEach(a => a.dispatchEvent(new Event('ended'))));
    await expect(play).toHaveAttribute('data-plays-left', String(i), { timeout: 5_000 });
  }
  await expect(play).toBeDisabled();
  await expect(play).toBeVisible();
});

test('vocab і flip-task: кожна картка перевертається', async ({ page }) => {
  await page.goto(URL);
  for (const kind of ['vocab', 'comm-tasks']) {
    const data = load(kind);
    if (!data) continue;
    for (const x of data.items) {
      const card = page.locator(`[data-item-id="${x.id}"]`);
      if (!(await card.isVisible())) await page.locator(`[data-role="tab"][data-target-block="${kind}"]`).first().click();
      await card.locator('[data-role="flip"]').first().click();
      await expect(card, `${x.id}: картка не перевернулась`).toHaveAttribute('data-flipped', 'true');
    }
  }
});

test('фото: питання-опори на місці, фото не обрізане', async ({ page }) => {
  const pics = load('pictures');
  test.skip(!pics, 'немає picture-set');
  await page.goto(URL);
  for (const x of pics.items) {
    const card = page.locator(`[data-item-id="${x.id}"]`);
    if (!(await card.isVisible())) await page.locator(`[data-role="tab"][data-target-block="pictures"]`).first().click();
    await expect(card.locator('[data-role="helper-question"]')).toHaveCount(x.helper_questions.length);
    const img = card.locator('img');
    const status = await card.getAttribute('data-image-status');
    if (status === 'ok') {
      const fit = await img.evaluate(e => getComputedStyle(e).objectFit);
      expect(fit, `${x.id}: object-fit: cover заборонено`).not.toBe('cover');
      const loaded = await img.evaluate((e: HTMLImageElement) => e.complete && e.naturalWidth > 0);
      expect(loaded, `${x.id}: фото не завантажилось`).toBe(true);
    }
  }
});

test('сторінка: немає нерозгорнутих маркерів і помилок у консолі', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(URL);
  const html = await page.content();
  for (const m of ['[IMAGE', '[AUDIO', '[SLIDES', '[EXERCISE']) {
    expect(html.includes(m), `маркер ${m} не розгорнуто`).toBe(false);
  }
  expect(errors, 'помилки в консолі').toEqual([]);
});

test('презентація: усі слайди відкриваються, нотатки лише з ?teacher=1', async ({ page }) => {
  const slides = load('slides').slides;
  for (const s of slides) {
    await page.goto(`${SLIDES_URL}#${s.id}`);
    await expect(page.locator(`[data-slide-id="${s.id}"]`), `${s.id}: слайд не відкрився`).toBeVisible();
  }
  await page.goto(SLIDES_URL);
  await expect(page.locator('[data-role="teacher-note"]')).toHaveCount(0);
  await page.goto(`${SLIDES_URL}?teacher=1#s2`);
  await expect(page.locator('[data-role="teacher-note"]').first()).toBeVisible();
});
