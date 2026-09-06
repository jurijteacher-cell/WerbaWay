# Werba Way — Content Handoff Spec (v2)

Контракт між Claude (контент) і Cursor (виконання). Стосується ТІЛЬКИ нових лекцій, створених за цим шаблоном далі. Старі лекції не переробляємо.

## Структура репозиторію

```
content-queue/
  lectures/
    pending/
    published/
  exercises/
    pending/
    published/
  _manifest.json
  module_map.json
```

## Naming convention

`{module}-{lesson_number}-{slug}.{ext}`, напр. `pl-a1-group-05-family-vocab.md`
lecture і всі його exercise-файли одного уроку мають той самий `{module}-{lesson_number}-{slug}` префікс + суфікс типу вправи: `...-vocab.json`, `...-pictures.json`, `...-comm-tasks.json`, `...-grammar.json`, `...-hw-grammar.json`.

## Обов'язкова структура уроку (нові лекції)

1. **Читання** — оригінальний текст (написаний з нуля на основі теми реальної статті, не копія — авторське право), 1–2 зображення інтегровані в текст.
2. **Питання до тексту** — 3–5 питань.
3. **Словниковий блок** — нові складні для рівня слова + визначення, інтерактивна вправа (тип `vocab-cards`), 10–15 хв контенту.
4. **Розмовна практика** — 15–20 хв, кілька відкритих питань (просто список, не інтерактивна вправа).
5. **Картинковий блок** — 5–6 картинок, окреме питання до кожної (тип `picture-set`).
6. **Комунікаційні задачі** — 3–4 картки-переверти (тип `flip-task`): на лицьовій стороні назва задачі, всередині — умова + опорні пункти, які учень має з'ясувати/виконати.
7. **Граматика** — одна повна, але проста таблиця (усі випадки описані, нічого досочіплювати), винятки — окремим блоком під таблицею.
8. **Граматичні вправи** — метод піраміди (наростаюча складність), якщо тема велика — дробимо на частини; винятки відпрацьовуємо окремо, потім об'єднуємо з основною частиною.
9. **Підсумок уроку** — що вдалося, коротке обговорення.
10. **Домашнє завдання**:
    - слова з уроку
    - реальне відео на YouTube АБО стаття по темі (Claude шукає в мережі і дає робоче посилання — не Cursor)
    - граматичні вправи — той самий рівень складності, але інший вміст (мінімум дублювання речень/слів з уроку)
    - коротка письмова практика: лист / повідомлення / рекламація / уточнення (варіюється по темі)

Заголовок сторінки: тематична картинка + форматоване форматування тексту (жирний, списки, розділювачі), емоджі — точково, не засмічувати.

## Типи вправ (enum) — 5 старих LMS-типів + нові

Нові типи, які додаються до існуючих 5:
- `fill-in-blank` — заповнення пропусків
- `sentence-building` — складання речення з розкиданих слів
- `drag-and-drop`
- `matching` — сполучення термін↔визначення
- `vocab-cards` — словниковий інтерактив (нові важкі слова + визначення)
- `picture-set` — 5–6 картинок, питання до кожної
- `flip-task` — картка-переверт для комунікативної задачі

Курсор мапить ці назви на internal enum LMS і формує under-the-hood схему; Claude завжди пише тип словами з цього списку.

## Формат лекції (.md)

```markdown
---
title: "Rodzina — słownictwo podstawowe"
module: pl-a1-group
lesson_number: 5
level: A1
tags: [vocab, family]
status: draft
header_image_keywords: "polish family home warm"
---

(студентський текст: читання з інтегрованими картинками, питання до тексту,
розмовні питання, підсумок. Емоджі точково. Жодних міток чи TODO в тілі.)
```

Кожне місце під картинку в тілі позначається інлайн-міткою для Cursor:
`[IMAGE: keywords="mother reading book child", alt="Мама читає дитині книжку"]`
Cursor замінює це на реальне зображення зі стокового банку за keywords.

## Формат вправи (.json) — приклад для нового типу

```json
{
  "lesson_id": "pl-a1-group-05-family-vocab",
  "exercise_type": "vocab-cards",
  "title": "Trudne słowa",
  "instructions": "Дізнайся значення нових слів.",
  "items": [
    { "id": 1, "term": "...", "definition": "...", "example_sentence": "..." }
  ],
  "meta": { "estimated_minutes": 12 }
}
```

```json
{
  "lesson_id": "pl-a1-group-05-family-vocab",
  "exercise_type": "flip-task",
  "title": "Zadania komunikacyjne",
  "items": [
    {
      "id": 1,
      "front_title": "Zadanie 1: Przedszkole",
      "back_scenario": "Twoje dziecko idzie do przedszkola. Zadzwoń i porozmawiaj z pracownikiem.",
      "back_checklist": [
        "Dowiedz się, o której godzinie ma przyjść dziecko",
        "Zapytaj, co trzeba ze sobą zabrać",
        "Zapytaj, ile trwa dzień w przedszkolu",
        "Ustal, kiedy i jak wnieść opłatę"
      ]
    }
  ]
}
```

```json
{
  "lesson_id": "pl-a1-group-05-family-vocab",
  "exercise_type": "picture-set",
  "title": "Opisz obrazki",
  "items": [
    { "id": 1, "image_keywords": "family dinner table", "question": "Co robi rodzina?" }
  ]
}
```

## Homework-файл окремо

`{module}-{lesson_number}-{slug}-hw.json` — містить: слова, посилання на відео/статтю (реальне, знайдене Claude), grammar-вправи (варіація), тему письмової практики.

## Жорсткі правила

- Один і той самий шаблон/генератор для кожного типу вправи — Cursor відповідає, щоб верстка була ідентична від лекції до лекції і без багів.
- Ніяких службових приміток чи TODO у файлах — усе обговорення в чаті.
- header_image_keywords і всі image_keywords — обов'язкові поля, без них Cursor не публікує (немає що шукати в стоковому банку).
