# CURSOR_TASK · pl-a2-mow-04-jedzenie

Модуль `pl-a2-mow` (розмовна польська A2, `light-60`), **урок 4** — «Poproszę pierogi! Jedzenie i restauracja». 1 × 60 хв, рівень A2, учні україномовні.

Ця задача — повна інструкція. Роби кроки по черзі, нічого не пропускай і не додавай від себе. Контракт збірки — `CURSOR_BUILD_RULES.md`; словник — `SPEC_PATCH_v3.6.md` (тільки Quizlet). **Зразок — опублікований урок `pl-a2-mow-03-wolny-czas`**: та сама структура розділів, ті самі компоненти, той самий батьківський модуль у Notion.

**Не можна:**
- змінювати зміст: тексти, відповіді, `accept[]`, `grammar_point`, слайди, питання;
- підміняти тип вправи, прибирати блок або рендерити його текстом;
- шукати чи замінювати фото (адреси вже в пакеті);
- створювати чи редагувати набір у Quizlet;
- чіпати файли інших уроків і робити задачі з беклогу.

Помилку в змісті не виправляй — запиши в розділ звіту «ПОМИЛКИ В КОНТЕНТІ» (файл, id, що не так).

---

## Склад пакета

| Файл | Де лежить | Тип |
|---|---|---|
| `pl-a2-mow-04-jedzenie.md` | `content-queue/lectures/pending/` | вихідник сторінки з маркерами |
| `pl-a2-mow-04-jedzenie-slides.json` | `content-queue/slides/pending/` | `grammar-slides`, 10 слайдів, 1 частина |
| `pl-a2-mow-04-jedzenie-vocab.json` | `content-queue/exercises/pending/` | джерело слів, `publish: quizlet` — **не публікувати** як vocab-cards |
| `pl-a2-mow-04-jedzenie-comm-tasks.json` | `content-queue/exercises/pending/` | `flip-task`: c1 `listen-then-play` (діалог 11 реплік + TTS), c2 і c3 `play` |
| `pl-a2-mow-04-jedzenie-grammar.json` | `content-queue/exercises/pending/` | g1–g3 `fill-in-blank` (g1, g3 з `options`) |
| `pl-a2-mow-04-jedzenie-hw.json` | `content-queue/exercises/pending/` | h1 `matching`, h2 `fill-in-blank` (h2-8 з `options`), h3 `drag-and-drop` |
| `pl-a2-mow-04-jedzenie-teacher.md` | `content-queue/teacher/pending/` | файл викладача — **не публікувати учням** |
| `CURSOR_TASK_pl-a2-mow-04-jedzenie.md` | `content-queue/lectures/pending/` | ця задача |

Немає `pictures.json` і `exam.json` — нормально для `light-60`.

## Свідомі відхилення від `light-60` (як в уроці 03, не блокувати)

- Рівень **A2**: текст ~290 слів, письмо в ДЗ 80–100 слів.
- **3** комунікаційні задачі замість 2.
- Додаткові розділи `.md`: **4. Praktyka mówienia** і **6. Jak na egzaminie** — звичайний текст і списки, без маркерів.
- Словник 25 слів, 4 групи, 3 `comm_groups`.
- Теги `grammar_points`: `biernik-zamawianie`, `ilosc-dopelniacz`, `przeczenie-dopelniacz`, `celownik-bezosobowe`, `dla-do-na`, `kalki-uk`, `slownictwo`. `celownik-bezosobowe` уже є в реєстрі A2; решту, якщо `seed_lesson.py` перевіряє реєстр, **додати в реєстр**, а не міняти в уроці.

---

## КРОК 0 · Перевірка змісту (2 хв)

1. Збери файли пакета в тимчасову папку й запусти `python3 scripts/check_lesson_package.py <папка>`. Код `0` — далі, код `1` — стоп і звіт. `WARN` про кількість слів словника і тексту — очікувані (див. відхилення).
2. Перевір, що в `.md` і `vocab.json` **немає** рядка `{{QUIZLET_SET_ID}}`. Якщо є — **стоп**, звіт «немає set_id Quizlet» (Юра вписує set_id після імпорту набору).

## КРОК 1 · Компоненти (gate)

Потрібні: `flip-task` (+ `listen-then-play` з `model_dialogue`), `fill-in-blank` (+ `options[]`), `matching`, `drag-and-drop` (з зайвими картками в банку), рушій слайдів (`table`, `steps`, `compare`, `exceptions`, `traps`), аудіо-касета для `[AUDIO]` (TTS), Słowniczek, Quizlet-embed, блок цілей. Усе вже працює в `pl-a2-mow-03-wolny-czas`. Чогось немає — назви у звіті й зупинись.

## КРОК 2 · Маркери

| Маркер у `.md` | Що зробити |
|---|---|
| `header_image_url` у frontmatter | cover сторінки Notion; підпис `header_image_credit` з посиланням у «Źródła» |
| `[AUDIO: id="pl-a2-mow-04-jedzenie-czytanie", …]` (розділ 1) | TTS усього тексту від `### Bar mleczny „Pod Kogutem”` до кінця опінії Moniki (без маркерів), `pl-PL-female`, speed `0.85`; касета над текстом |
| `[IMAGE: slot="img1", url="…", …]` (розділ 1) | блок зображення з `url` (хотлінк), підпис `{alt}. Photo: Zoshua Colah`, посилання `credit_url` у «Źródła». Не обрізати |
| `[QUIZLET: set_id="…", …]` (розділ 2) | справжній embed `https://quizlet.com/{set_id}/flashcards/embed`, не посилання; `/embed/pl-a2-mow-04-jedzenie/vocab` **не** публікувати, TTS для словника не генерувати |
| `[SLIDES: …slides.json, part="1"]` (розділ 3) | `public/slides/pl-a2-mow-04-jedzenie.json` (без `teacher_note`) + `.teacher.json`; кнопка й iframe на `#s1` |
| `[EXERCISE: …grammar.json, blocks="g1-g3"]` (розділ 3) | усі три блоки |
| `[AUDIO: id="pl-a2-mow-04-jedzenie-c1-dialog", …]` (розділ 5) | TTS 11 реплік c1, кожна своїм `voice` (Kelner — `pl-PL-male`, Julia — `pl-PL-female`), speed `0.9`; касета |
| `[EXERCISE: …comm-tasks.json]` (розділ 5) | `flip-task`; на c1 під карткою — текст `model_dialogue` за ролями, як в уроці 03 |
| `[EXERCISE: …hw.json]` (розділ 8) | h1–h3 |
| Таблиці «Słowniczek» | парсити в компонент (4 групи, 25 слів), не сирий markdown |

`[[…]]` у слайдах — жовтий маркер. Кирилиця в слайдах-пастках (`uk`, `why`) навмисна.

## КРОК 3 · Notion

- Батьківська сторінка — `pl-a2-mow` з `module_map.json` (там уже лежить урок 03).
- Назва сторінки: **`04 · Poproszę pierogi! Jedzenie i restauracja`**.
- Full width, вікна вправ розгорнуті на повну висоту.
- Запис у `content-queue/_manifest.json` з `quizlet_set_id`, embed-посиланнями, аудіо-файлами й `notion_page_id`.

## КРОК 4 · Перевірка в UI

Кожен елемент кожної вправи — відкрити й натиснути. Окремо:
- кнопки `options[]` належать своєму елементу (відомий баг з дублюванням з першого елемента);
- h1: 6 пар, праві частини унікальні;
- h3: у банку 9 карток, 3 зайві (`mięso`, `podobało`, `pomidory`) лишаються невикористаними;
- відповідь без огонків зараховується з підказкою `↳ z ogonkami: …` (напр. g2-7 `zurku`, h2-1 `jajecznice`);
- обидва аудіо грають, перемикач швидкості працює;
- `?teacher=1` показує нотатки, без нього — ні;
- у розділі «2. Słownictwo» немає `werba-way.vercel.app/embed/pl-a2-mow-04-jedzenie/vocab`;
- cover і фото в тексті видно, підписи в «Źródła» є;
- у сторінці немає жодного рядка `[IMAGE`, `[AUDIO`, `[SLIDES`, `[EXERCISE`, `[QUIZLET` (grep).

Після публікації — перемісти файли з `pending/` у `published/` за звичною схемою.

## КРОК 5 · Звіт

Форма — `CURSOR_BUILD_RULES.md` §8. Рядки маркерів:

```
header         → {url}
img1           → {url}
audio czytanie → {файл}
audio c1       → {файл}
quizlet        → {set_id} embed ок / …
slides part 1  → {посилання}
grammar g1-g3  → ок / …
comm-tasks     → ок / …
hw             → ок / …
słowniczek     → ок / …
```
