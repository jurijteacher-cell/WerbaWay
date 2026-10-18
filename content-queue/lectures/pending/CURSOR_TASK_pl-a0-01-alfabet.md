# CURSOR_TASK · pl-a0-01-alfabet

Курс A0 → A1 «Olena w Krakowie» (`module: pl-a1`), **урок 1 з 46** (`curriculum_id: 0.1`, `course_order: 1`) — «Alfabet i czytanie», читання, диграфи, ogonki, наголос. 1 × 90 хв, рівень A0, учні україномовні.

Ця задача — повна інструкція. Роби кроки по черзі, нічого не пропускай і не додавай від себе. Контракт збірки — `CURSOR_BUILD_RULES.md`; словник — `SPEC_PATCH_v3.6.md` (тільки Quizlet). Зразок уже опублікованої лекції з тими самими блоками — `pl-b1-group-07-dojazd`; аудіо-касета — як у `pl-preg-07-zakupy-i-budzet`.

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
| `pl-a0-01-alfabet.md` | `content-queue/lectures/pending/` | вихідник сторінки з маркерами |
| `pl-a0-01-alfabet-slides.json` | `content-queue/slides/pending/` | `grammar-slides`, 8 слайдів, 1 частина |
| `pl-a0-01-alfabet-vocab.json` | `content-queue/exercises/pending/` | джерело слів, `publish: quizlet` — **не публікувати** як vocab-cards |
| `pl-a0-01-alfabet-comm-tasks.json` | `content-queue/exercises/pending/` | `flip-task`, c1 (`listen-then-play`, діалог 10 реплік + TTS) + c2 (`play`) |
| `pl-a0-01-alfabet-grammar.json` | `content-queue/exercises/pending/` | g1 `matching`, g2 `drag-and-drop`, g3–g4 `fill-in-blank` (+ `options`) |
| `pl-a0-01-alfabet-hw.json` | `content-queue/exercises/pending/` | hw1–hw3: `fill-in-blank` (+ `options`), hw3 без options |
| `pl-a0-01-alfabet-teacher.md` | `content-queue/teacher/pending/` | файл викладача — **не публікувати учням** |
| `CURSOR_TASK_pl-a0-01-alfabet.md` | `content-queue/lectures/pending/` | ця задача |

Немає `pictures.json` (опис фото прибрано з 2026-10-07) і `exam.json` (на A0 не створюється). Є TTS: текст Czytanie і діалог c1, швидкість `0.75`.

На A0 кожен JSON має `instruction_uk` поруч з `instruction` (верхній рівень і кожен блок): показувати його під польською інструкцією дрібнішим шрифтом.

---

## КРОК 0 · Перевірка змісту (2 хв)

1. Збери всі файли пакета в одну тимчасову папку й запусти:
   ```bash
   python3 scripts/check_lesson_package.py <папка>
   ```
2. Код `0` — далі. Код `1` — **стоп**, звіт з помилками. `WARN` не блокує, копіюється у звіт.
   **Відомі розбіжності скрипта з протоколом A0** (не стоп, лише у звіт): `slides: пасток 3, норма 5–6` — на A0 за протоколом 1 слайд пасток з 3 пастками з карти. Будь-яка інша помилка — стоп.
3. Перевір, що в `.md` і `vocab.json` **немає** рядка `{{QUIZLET_SET_ID}}`. Якщо є — стоп, звіт «немає set_id Quizlet».

## КРОК 1 · Компоненти (gate)

Потрібні типи: `flip-task` (+ `listen-then-play` з `model_dialogue`), `fill-in-blank` (+ `options[]`, + `"diacritics": "strict"` у g3, hw1, hw3), `drag-and-drop`, `matching`, рушій слайдів, аудіоплеєр-касета для `[AUDIO]` (TTS), Słowniczek, Quizlet-embed, блок цілей. TTS-компонент (`AudioCassette` / `Listening`) уже працює в `pl-preg-07-zakupy-i-budzet`. Якщо якогось компонента немає — назви у звіті й зупинись.

## КРОК 2 · Маркери

| Маркер у `.md` | Що зробити |
|---|---|
| `header_image_keywords` / `_alt` у frontmatter | шапка з Unsplash: `train window journey` → запасний `railway tracks morning` |
| `[AUDIO: id="pl-a0-01-czytanie", text="section:1", …]` (розділ 1) | TTS усього тексту Czytanie (від `### Wrocław — Kraków` до кінця розділу, без маркерів), `pl-PL-female`, speed `0.75`; плеєр-касета над текстом |
| `[IMAGE: keywords="woman train window", image_keywords_alt="train station platform", …]` (розділ 1) | Unsplash за `CURSOR_BUILD_RULES` §3: перший результат з `width >= 900`, один повтор з alt, далі `missing`. Таймбокс на обидва фото — 3 хв |
| `[QUIZLET: set_id="1223959934", …]` (розділ 3) | справжній embed-блок Notion `https://quizlet.com/{set_id}/flashcards/embed`, не посилання. `/embed/pl-a0-01-alfabet/vocab` **не** публікувати, TTS для словника не генерувати |
| `[AUDIO: id="pl-a0-01-c1-dialog", text="…comm-tasks.json#c1.model_dialogue", …]` (розділ 5) | TTS 10 реплік c1, кожна своїм `voice` (Konduktor — `pl-PL-male`, Olena — `pl-PL-female`), speed `0.75`; плеєр-касета |
| `[EXERCISE: …comm-tasks.json]` (розділ 5) | `flip-task`; на c1 під карткою — текст `model_dialogue` за ролями (як у Dojazd) |
| `[SLIDES: …slides.json, part="1"]` (розділ 6) | `public/slides/pl-a0-01-alfabet.json` (без `teacher_note`) + `.teacher.json`; кнопка й iframe на `#s1` |
| `[EXERCISE: …grammar.json, blocks="g1-g4"]` (розділ 6) | g1 matching, g2 drag-and-drop, g3 fill+options (strict), g4 fill+options |
| `[EXERCISE: …hw.json]` (розділ 8) | усі блоки hw1–hw3 |
| Таблиці «Słowniczek» | парсити в компонент (3 групи, 20 слів), не сирий markdown |

Схема слайдів — та сама, що в `pl-b1-group-07-dojazd-slides.json` (`table` з `columns/rows`, `compare` з `left/right.head/rule/examples`, `exceptions`, `traps`). `[[…]]` — жовтий маркер. Кирилиця в клітинках таблиць і в пастках — це навмисні українські відповідники звуків, не помилка.

## КРОК 3 · Notion

- Батьківська сторінка — `pl-a1` з `module_map.json`.
- Сторінка у **Full width**, вбудовані вікна вправ розгорнуті на повну висоту (не дефолтна мала).
- Поле «№ у курсі» / `course_order` = **1** (якщо поле вже є в базі «Всі лекції»).
- Додай запис у `content-queue/_manifest.json` з `quizlet_set_id`, embed-посиланнями, аудіо-файлами й `notion_page_id`.

## КРОК 4 · Перевірка в UI

Кожен елемент кожної вправи — відкрити й натиснути. Окремо:
- кнопки `options[]` належать своєму елементу (відомий баг з дублюванням з першого елемента);
- g1: 6 пар, кожна права частина унікальна;
- g2: у банку 7 карток, 2 зайві (`dz`, `cz`) лишаються невикористаними;
- g3, hw1, hw3 (`diacritics: strict`): відповідь без огонків — **червона**; в інших блоках — зелена з підказкою `↳ z ogonkami: …`;
- `instruction_uk` видно під кожною інструкцією;
- обидва аудіо грають, перемикач швидкості працює;
- `?teacher=1` показує нотатки, без нього — ні;
- у розділі «3. Słownictwo» немає `werba-way.vercel.app/embed/pl-a0-01-alfabet/vocab`;
- у сторінці немає жодного рядка `[IMAGE`, `[AUDIO`, `[SLIDES`, `[EXERCISE`, `[QUIZLET` (grep).

Після публікації — перемісти файли з `pending/` у `published/` за звичною схемою.

## КРОК 5 · Звіт

Форма — `CURSOR_BUILD_RULES.md` §8. Рядки маркерів для цього уроку:

```
header         → {url або missing}
img1           → {url або missing}
audio czytanie → {файл}
audio c1       → {файл}
quizlet        → {set_id} embed ок / …
slides part 1  → {посилання}
comm-tasks     → ок / …
grammar g1-g4  → ок / …
hw             → ок / …
słowniczek     → ок / …
```
