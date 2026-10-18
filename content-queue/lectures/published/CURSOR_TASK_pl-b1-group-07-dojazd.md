# CURSOR_TASK · pl-b1-group-07-dojazd

Груповий курс B1 (`module: pl-b1-group`), **лекція 7 з 22** (`course_order: 7`) — «Dojazd do pracy: miasto w ruchu», дієслова руху. 2 × 90 хв.

Ця задача — повна інструкція. Роби кроки по черзі, нічого не пропускай і не додавай від себе. Контракт збірки — `CURSOR_BUILD_RULES.md`; словник — `SPEC_PATCH_v3.6.md` (тільки Quizlet). Зразок уже опублікованої лекції того самого формату — `pl-b1-group-05-pasje` (той самий набір блоків і компонентів).

**Не можна:**
- змінювати зміст: тексти, відповіді, `accept[]`, `grammar_point`, слайди, питання;
- підміняти тип вправи, прибирати блок або рендерити його текстом;
- створювати чи редагувати набір у Quizlet;
- чіпати файли інших уроків і робити задачі з беклогу.

Помилку в змісті не виправляй — запиши в розділ звіту «ПОМИЛКИ В КОНТЕНТІ» (файл, id, що не так).

---

## Склад пакета

| Файл | Де лежить | Тип |
|---|---|---|
| `pl-b1-group-07-dojazd.md` | `content-queue/lectures/pending/` | вихідник сторінки з маркерами |
| `pl-b1-group-07-dojazd-slides.json` | `content-queue/slides/pending/` | `grammar-slides`, 17 слайдів, 2 частини |
| `pl-b1-group-07-dojazd-vocab.json` | `content-queue/exercises/pending/` | джерело слів, `publish: quizlet` — **не публікувати** як vocab-cards |
| `pl-b1-group-07-dojazd-comm-tasks.json` | `content-queue/exercises/pending/` | `flip-task`, c1 (`read-then-play`, діалог 12 реплік) + c2–c4 |
| `pl-b1-group-07-dojazd-grammar.json` | `content-queue/exercises/pending/` | g1–g8: `fill-in-blank` (+ `options`), `drag-and-drop`, `matching`, `sentence-building` |
| `pl-b1-group-07-dojazd-exam.json` | `content-queue/exercises/pending/` | e1 `true-false`, e2 `multiple-choice` |
| `pl-b1-group-07-dojazd-hw.json` | `content-queue/exercises/pending/` | hw1–hw3: `fill-in-blank`, `sentence-building` |
| `pl-b1-group-07-dojazd-teacher.md` | `content-queue/teacher/pending/` | файл викладача — **не публікувати учням** |
| `CURSOR_TASK_pl-b1-group-07-dojazd.md` | `content-queue/lectures/pending/` | ця задача |

Немає `pictures.json` (опис фото прибрано з 2026-10-07) і TTS (`[AUDIO]` у B1-групі не використовується: c1 — `read-then-play`, e2 читає викладач).

---

## КРОК 0 · Перевірка змісту (2 хв)

1. Збери всі файли пакета в одну тимчасову папку й запусти:
   ```bash
   python3 scripts/check_lesson_package.py <папка>
   ```
2. Код `0` — далі. Код `1` — **стоп**, звіт з помилками. `WARN` не блокує, копіюється у звіт.
3. Перевір, що в `.md` і `vocab.json` **немає** рядка `{{QUIZLET_SET_ID}}`. Якщо є — стоп, звіт «немає set_id Quizlet».

## КРОК 1 · Компоненти (gate)

Потрібні типи: `flip-task` (+ `read-then-play`), `fill-in-blank` (+ `options[]`), `drag-and-drop`, `matching`, `sentence-building`, `true-false`, `multiple-choice`, рушій слайдів, Słowniczek, Quizlet-embed, блок цілей. Усі вони вже працюють у `pl-b1-group-05-pasje` — бери ті самі компоненти. Якщо якогось немає — назви у звіті й зупинись.

## КРОК 2 · Маркери

| Маркер у `.md` | Що зробити |
|---|---|
| `header_image_keywords` / `_alt` у frontmatter | шапка з Unsplash: `tram city morning` → запасний `people bus stop` |
| `[IMAGE: keywords="tram city street", image_keywords_alt="bicycle lane city", …]` (розділ 1) | Unsplash за `CURSOR_BUILD_RULES` §3: перший результат з `width >= 900`, один повтор з alt, далі `missing`. Таймбокс на обидва фото — 3 хв |
| `[EXERCISE: …exam.json, blocks="e1"]` (розділ 2) | компонент `true-false`, тільки блок e1 |
| `[QUIZLET: set_id=…]` (розділ 3) | справжній embed-блок Notion `https://quizlet.com/{set_id}/flashcards/embed`, не посилання. `/embed/pl-b1-group-07-dojazd/vocab` **не** публікувати |
| `[EXERCISE: …exam.json, blocks="e2"]` (розділ 5) | `multiple-choice`, без аудіо: викладач читає діалог c1, `max_plays: 2` — лише лічильник |
| `[EXERCISE: …comm-tasks.json]` (розділ 5) | `flip-task`; на c1 під карткою — текст `model_dialogue` за ролями (як у Pasje) |
| `[SLIDES: …slides.json, part="1"]` (розділ 6) | `public/slides/pl-b1-group-07-dojazd.json` (без `teacher_note`) + `.teacher.json`; кнопка й iframe на `#s1` |
| `[EXERCISE: …grammar.json, blocks="g1-g4"]` | g1 fill+options, g2 drag-and-drop, g3 fill+options, g4 fill+options |
| `[SLIDES: …, part="2"]` (розділ 7) | ті самі файли, кнопка й iframe на `#s9` |
| `[EXERCISE: …grammar.json, blocks="g5-g8"]` | g5 fill+options, g6 matching, g7 sentence-building, g8 fill+options |
| `[EXERCISE: …hw.json]` (розділ 9) | усі блоки hw1–hw3 |
| Таблиці «Słowniczek» | парсити в компонент (6 груп, 40 слів), не сирий markdown |

Схема слайдів — та сама, що в `pl-b1-group-05-pasje-slides.json` (`compare` з `left/right.head/rule/examples`, `table` з `columns/rows`, `steps`, `examples`, `exceptions`, `traps`). `[[…]]` — жовтий маркер.

## КРОК 3 · Notion

- Батьківська сторінка — `pl-b1-group` з `module_map.json`.
- Сторінка у **Full width**, вбудовані вікна вправ розгорнуті на повну висоту (не дефолтна мала).
- Поле «№ у курсі» / `course_order` = **7** (якщо поле вже є в базі «Всі лекції»).
- Додай запис у `content-queue/_manifest.json` з `quizlet_set_id`, embed-посиланнями й `notion_page_id`.

## КРОК 4 · Перевірка в UI

Кожен елемент кожної вправи — відкрити й натиснути. Окремо:
- кнопки `options[]` належать своєму елементу (відомий баг з дублюванням з першого елемента);
- g2: у банку 8 слів, 2 зайві (`szedłem`, `jadą`) лишаються невикористаними;
- g6: 8 пар, кожна права частина унікальна;
- g7, hw3: варіанти з `accept[]` зараховуються;
- відповідь без огонків — зелена з підказкою `↳ z ogonkami: …`;
- `?teacher=1` показує нотатки, без нього — ні;
- у розділі «3. Słownictwo» немає `werba-way.vercel.app/embed/pl-b1-group-07-dojazd/vocab`;
- у сторінці немає жодного рядка `[IMAGE`, `[SLIDES`, `[EXERCISE`, `[QUIZLET` (grep).

Після публікації — перемісти файли з `pending/` у `published/` за звичною схемою.

## КРОК 5 · Звіт

Форма — `CURSOR_BUILD_RULES.md` §8. Рядки маркерів для цього уроку:

```
header        → {url або missing}
img1          → {url або missing}
quizlet       → {set_id} embed ок / …
slides part 1 → {посилання}
slides part 2 → {посилання}
exam e1       → ок / …
exam e2       → ок / …
comm-tasks    → ок / …
grammar g1-g4 → ок / …
grammar g5-g8 → ок / …
hw            → ок / …
słowniczek    → ок / …
```
