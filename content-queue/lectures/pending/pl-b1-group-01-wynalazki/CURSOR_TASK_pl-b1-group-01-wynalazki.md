# CURSOR_TASK · pl-b1-group-01-wynalazki (переробка під v3.4, 2026-10-17)

Урок **уже опублікований**. Це не новий урок, а оновлення: нові слайди граматики, екзаменаційні блоки, цілі й розминка, джерела, прибраний «Opis zdjęć». Зміст написав Claude, Юра підтвердив переробку.

**Сторінка Notion, яку оновлюєш на місці (не створюй нову):** `3d896e03-c7c8-80bd-af61-de7a488b1ea6`
Claude 2026-10-17 уже частково вніс правки в цю сторінку вручну. Усі вони є у `pl-b1-group-01-wynalazki.md`, тож сторінку можна повністю перезібрати з `.md`.

**Не можна:**
- змінювати зміст: тексти, відповіді, `accept[]`, `grammar_point`, слайди, питання;
- підміняти тип вправи, прибирати блок або рендерити його текстом;
- шукати нові фото: зображення уроку вже лежать у `public/content/pl-b1-group-01-wynalazki/`, бери їх;
- генерувати TTS (правило `content-queue.mdc`: без аудіо для нових збірок);
- чіпати файли інших уроків і задачі з беклогу.

Помилку в змісті не виправляй, а записуй у «ПОМИЛКИ В КОНТЕНТІ».

---

## Склад пакета

| Файл | Що це |
|---|---|
| `pl-b1-group-01-wynalazki.md` | вихідник сторінки з маркерами |
| `pl-b1-group-01-wynalazki-slides.json` | презентація, 17 слайдів: частина 1 — s1–s9, частина 2 — s10–s17 |
| `pl-b1-group-01-wynalazki-vocab.json` | словник (джерело для Quizlet і Słowniczka) |
| `pl-b1-group-01-wynalazki-comm-tasks.json` | комунікаційні задачі, `flip-task` |
| `pl-b1-group-01-wynalazki-grammar.json` | граматичні вправи g1–g8 з `covers_slides` |
| `pl-b1-group-01-wynalazki-exam.json` | `e1` читання P/F, `e2` слухання/діалог multiple-choice |
| `pl-b1-group-01-wynalazki-hw.json` | домашка |
| `pl-b1-group-01-wynalazki-teacher.md` | файл викладача — **не публікувати учням** |

`pl-b1-group-01-wynalazki-pictures.json` у пакет **не входить**: розділ «Opis zdjęć» прибрано (рішення від 2026-10-07). Embed `/embed/pl-b1-group-01-wynalazki/pictures` з Notion прибрати, сам файл у `published/` не видаляй.

## КРОК 0 · Перевірка пакета (2 хв)

```bash
python3 scripts/check_lesson_package.py content-queue/lectures/pending/pl-b1-group-01-wynalazki
```

`0` — далі. `1` — стоп і звіт.

## КРОК 1 · Компоненти (gate)

Як у `claude/CURSOR_BUILD_RULES.md`, розділ 2. Для цього уроку потрібні: `vocab-cards` (або Quizlet, див. крок 5), `flip-task`, `fill-in-blank` (+ `options[]`), `matching`, `sentence-building`, `drag-and-drop`, `true-false`, `multiple-choice`, рушій презентації, блок цілей з чекбоксами, Słowniczek-компонент. Чого немає — спершу компонент, потім урок; у звіті окремим рядком.

## КРОК 2 · Презентація (5 хв)

1. `pl-b1-group-01-wynalazki-slides.json` → `public/slides/pl-b1-group-01-wynalazki.json` (без `teacher_note`) і `public/slides/pl-b1-group-01-wynalazki.teacher.json` (з ними).
2. Схема та сама, що в `pl-b1-group-03-slang-slides.json` (`compare.left/right = head, rule, examples`; `steps.steps[] = label, text, optional`; `exceptions.items[] = rule, example, refers_to`). Рушій уже вміє цю схему — JSON не змінюй.
3. У Notion у кожному розділі граматики: кнопка `Otwórz prezentację` (нова вкладка, `#s{перший слайд частини}`) і вбудований `iframe` 16:9.

## КРОК 3 · Фото

Нових запитів до Unsplash **не робити**. Шапка й фото в тексті — ті самі, що в опублікованій версії (`public/content/pl-b1-group-01-wynalazki/`).

## КРОК 4 · Вправи в LMS

Скопіюй усі `.json` пакета в `src/content/queue-published/` (разом із `vocab.json`, інакше всі embed уроку дадуть 404). Задеплой і переконайся, що кожна адреса embed повертає 200, **до** публікації в Notion.

**Блоки за частинами — обов'язково.** Зараз у Notion обидві частини граматики показують один і той самий повний набір вправ. Кожен маркер з `blocks="g1-g4"` / `blocks="g5-g8"` (і `e1` / `e2`) рендериться як embed з параметром `?blocks=…`, як у `pl-b1-group-03-slang`.

**Без аудіо.** За `content-queue.mdc` TTS не генеруємо: у пакеті немає маркерів `[AUDIO]`, `c1` має `mode: "read-then-play"` (картка показує `model_dialogue` як текст за ролями), а `e2` — звичайний embed `multiple-choice` без плеєра: викладач читає діалог уголос двічі (`max_plays: 2` — це підказка для викладача, не для плеєра).

**Quizlet.** У `.md` стоїть маркер `[QUIZLET: set_id="1223463578"]`, у `vocab.json` — `"publish": "quizlet"`. Сет уже створений Claude 2026-10-18 (зворот картки = польське визначення + переклад у дужках). Ти сет не створюєш і не редагуєш, тільки вставляєш у розділ «Słownictwo» `<embed src="https://quizlet.com/1223463578/flashcards/embed">Słownictwo — Quizlet</embed>` замість `/embed/pl-b1-group-01-wynalazki/vocab`. `vocab.json` усе одно копіюєш у `src/content/queue-published/`.


## КРОК 5 · Маркери → розділи → компоненти

| Маркер | Розділ | Компонент |
|---|---|---|
| `[SLIDES: file="pl-b1-group-01-wynalazki-slides.json", part="1"]` | Gramatyka, część 1 | презентація + iframe |
| `[SLIDES: file="pl-b1-group-01-wynalazki-slides.json", part="2"]` | Gramatyka, część 2 | презентація + iframe |
| `[EXERCISE: … grammar.json … blocks="g1-g4"]` | Gramatyka, część 1 | embed `/grammar?blocks=g1-g4` |
| `[EXERCISE: … grammar.json … blocks="g5-g8"]` | Gramatyka, część 2 | embed `/grammar?blocks=g5-g8` |
| `[EXERCISE: … exam.json … blocks="e1"]` | Pytania do tekstu | embed `/exam?blocks=e1`, `true-false` |
| `[EXERCISE: … exam.json … blocks="e2"]` | Zadania komunikacyjne | embed `/exam?blocks=e2`, `multiple-choice` |
| `[QUIZLET: set_id="1223463578", …]` | Słownictwo | Notion `<embed src="https://quizlet.com/1223463578/flashcards/embed">`; `/embed/pl-b1-group-01-wynalazki/vocab` НЕ публікувати |
| `[EXERCISE: … comm-tasks.json …]` | Zadania komunikacyjne | flip-task |
| `[EXERCISE: … hw.json …]` | Praca domowa | hw |

Розділ «Źródła» в кінці `.md` — звичайний список посилань, рендерити як список з живими посиланнями.

## КРОК 6 · Перевірка

- grep опублікованої сторінки: немає `[IMAGE`, `[AUDIO`, `[SLIDES`, `[EXERCISE`, `[QUIZLET`, `/pictures`.
- Кожен елемент кожного блоку відкритий і перевірений (баг з дубльованими `options[]` першого елемента).
- Обидві частини презентації відкриваються, `?teacher=1` показує нотатки.
- Сторінка в режимі **Full width**, вікна вправ розгорнуті на повну висоту.
- `_manifest.json`: оновити запис уроку (`revision: "v3.4-rework"`, `embeds` + `slides`, `exam`), `notion_page_id` = `3d896e03-c7c8-80bd-af61-de7a488b1ea6`.

## Звіт — фіксована форма

```
УРОК: pl-b1-group-01-wynalazki — OK | OK з missing | BLOCKED
ЧАС: …
PREVIEW: LMS … | слайди … | Notion …
КРОК 0: …
КОМПОНЕНТИ: потрібні … / відсутні …
МАРКЕРИ: slides p1 … · slides p2 … · e1 … · e2 … · grammar g1-g4 … · grammar g5-g8 … · hw …
ПЕРЕВІРКА UI: елементів n з N · помилки …
ЗАЛИШИЛОСЯ: …
ПОМИЛКИ В КОНТЕНТІ (для Claude): …
```
