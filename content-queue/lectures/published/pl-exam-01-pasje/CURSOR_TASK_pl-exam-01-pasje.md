# CURSOR_TASK · pl-exam-01-pasje

Урок 1 екзаменаційного модуля (`module: pl-exam`) — «Czas wolny i pasje», рівень A1→A2, 2 × 60 хв.

Ця задача — повна інструкція. Роби кроки по черзі, нічого не пропускай і не додавай від себе. Якщо крок не виходить за свій таймбокс — фіксуй у звіті й іди далі. Не зупиняйся на півдорозі, щоб «подумати, як краще».

**Правила, на які спирається задача:** `rules/02_STYLE_VISUAL.md` (вигляд і взаємодія), `rules/04_TASKS.md` (схеми JSON), `rules/06_BUILD_AND_CHECKLIST.md` (збірка). Вони лежать у цьому архіві.

**Не можна:**
- змінювати зміст: тексти, відповіді, `accept[]`, `grammar_point`, слайди, питання;
- підміняти тип вправи, прибирати блок або рендерити його текстом;
- шукати «кращі» фото, відкривати unsplash.com у браузері;
- чіпати файли інших уроків і робити задачі з беклогу.

Помилку в змісті не виправляй, а записуй у розділ звіту «ПОМИЛКИ В КОНТЕНТІ» (файл, id, що не так).

---

## Склад пакета

| Файл | Що це | Тип |
|---|---|---|
| `pl-exam-01-pasje.md` | вихідник сторінки з маркерами | — |
| `pl-exam-01-pasje-slides.json` | презентація, 17 слайдів, 2 частини | `grammar-slides` |
| `pl-exam-01-pasje-vocab.json` | 25 карток, 4 групи | `vocab-cards` |
| `pl-exam-01-pasje-pictures.json` | 3 фото з питаннями-опорами | `picture-set` |
| `pl-exam-01-pasje-comm-tasks.json` | c1 (з діалогом), c2, c3 | `flip-task` |
| `pl-exam-01-pasje-grammar.json` | g1–g7 | `fill-in-blank`, `matching`, `sentence-building`, `drag-and-drop` |
| `pl-exam-01-pasje-exam.json` | e1 (читання P/F), e2 (слухання, 6 записів) | `true-false`, `multiple-choice` |
| `pl-exam-01-pasje-hw.json` | h1–h3 | `fill-in-blank`, `sentence-building` |
| `pl-exam-01-pasje-teacher.md` | файл викладача — **не публікувати учням** | — |
| `scripts/check_lesson_package.py` | перевірка змісту до збірки | — |
| `tests/lesson-exercises.spec.ts` | e2e-перевірка всіх вправ у браузері | — |

---

## КРОК 0 · Пакет на місце і перевірка змісту (2 хв)

1. Поклади папку пакета в ту саму чергу, куди кладеш попередні уроки (`content-queue/lectures/…/pl-exam-01-pasje/`). `scripts/` і `tests/` скопіюй у корінь репозиторію, якщо таких файлів там ще немає.
2. Запусти:
   ```bash
   python3 scripts/check_lesson_package.py content-queue/lectures/<папка>/pl-exam-01-pasje
   ```
3. Код виходу `0` — далі. Код `1` (є `ERROR`) — **стоп**: звіт із помилками, збірку не починати. `WARN` не блокує, але копіюється у звіт.

## КРОК 1 · Компоненти (gate)

Урок використовує 13 компонентів. Станом на 2026-10-14 частини з них немає. **Спершу компоненти, потім урок.** Цей крок не входить у 20-хвилинний таймбокс уроку: компоненти — окрема робота, у звіті вона йде окремим рядком.

| Компонент | Є? | Що зробити |
|---|---|---|
| `vocab-cards` | є | лише DOM-контракт (нижче) |
| `flip-task` (+ `listen-then-play`) | є | DOM-контракт; для `c1` під карткою — аудіо-касета з діалогом |
| `fill-in-blank` (+ `options[]`) | є | DOM-контракт; **виправити відомий баг**: кнопки `options[]` першого елемента дублюються в наступні |
| `matching` | є | DOM-контракт |
| `drag-and-drop` | є | DOM-контракт; клік-фолбек обов'язковий |
| рушій презентації | є (референс) | адаптер під схему слайдів (КРОК 2) |
| `sentence-building` | **немає** | за `02`: джерело сірим над полем на всю ширину; після 2 помилок — «Pokaż» |
| `true-false` | **немає** | штампи «P» / «F» праворуч; «↳ explanation» після відповіді |
| `multiple-choice` | **немає** | три чіпи в стовпчик; неправильний блідне, але лишається видимим. Для `e2` — `audio_mode: "per-item"`: у кожного елемента своя касета (`audio_id`, `dialogue`) |
| `picture-set` | **немає** | поляроїд за `02` (рамка під фото, **без** `object-fit: cover`); під фото `question`, під ним список `helper_questions` (показаний одразу, не схований); `phrase_bank` — один раз над фото; `status: "missing"` → порожній поляроїд «zdjęcie wkrótce» |
| аудіо-касета з `max_plays` | **немає** | за `02`: «zostały N odsłuchy» рукописом; після вичерпання кнопка гасне, але не зникає; перемикач 0.75 / 0.9 / 1 |
| блок цілей з чекбоксами | **немає** | жовта наліпка за `02`; у Podsumowanie — той самий блок з кнопкою «Sprawdzam się» |
| Słowniczek | є | таблиці з `.md` парсити в компонент, не markdown |

### DOM-контракт (обов'язковий — на ньому тримається e2e-тест)

Атрибути невидимі й на дизайн не впливають. Додай їх у компоненти, а тест не змінюй.

| Де | Атрибут |
|---|---|
| корінь блоку вправ | `data-block-id="g1"` (для vocab / comm-tasks / pictures — `"vocab"`, `"comm-tasks"`, `"pictures"`) |
| закладка, що відкриває блок | `data-role="tab"` `data-target-block="g1"` |
| корінь кожного елемента | `data-item-id="g1-1"` + `data-state="idle \| correct \| wrong \| correct-no-diacritics"` |
| поле вводу | `data-role="answer-input"` |
| кнопка «Sprawdź» | `data-role="check"` (в елементі або в блоці) |
| чіп варіанта | `data-role="option"` `data-value="<текст варіанта як у JSON>"` |
| штамп P/F | `data-role="tf"` `data-value="true"` / `"false"` |
| matching | лівий: `data-role="match-left"`, правий: `data-role="match-right"`, обидва з `data-value` |
| drag-and-drop | слово: `data-role="bank-word"` `data-value` + `data-used="true"`, коли стоїть у слоті; слот: `data-role="slot"` |
| пояснення «↳ …» | `data-role="explanation"` |
| кнопка аудіо | `data-role="audio-play"` `data-plays-left="2"` + `disabled`, коли 0 |
| картка, що перевертається | `data-role="flip"` на тригері, `data-flipped="true"` на корені після перевороту |
| фото | на корені елемента `data-image-status="ok \| missing"`; кожне питання-опора — `data-role="helper-question"` |
| слайд | `data-slide-id="s4"`; нотатка викладача — `data-role="teacher-note"` |

## КРОК 2 · Презентація (5 хв)

`pl-exam-01-pasje-slides.json` → `public/slides/pl-exam-01-pasje.json` (без `teacher_note`) і `public/slides/pl-exam-01-pasje.teacher.json` (з ними).

Схема слайда (спільні поля: `id`, `part`, `section` = `title | teoria | wyjatki | pulapki`, `kind`, `title`, `teacher_note`, опц. `note` — стікер 📌, завжди останній крок, опц. `reveal`):

| `kind` | Поля | Кроки відкриття |
|---|---|---|
| `title` | `question`, `goal` | без кроків |
| `table` | `headers[]`, `rows[][]` | `reveal`: `row` |
| `steps` | `bricks[]` = `{text, label}`, `result` | по цеглинці, потім `result` |
| `compare` | `left` / `right` = `{title, lines[]}` | ліва, права |
| `examples` | `items[]` = `{tag, pl, uk}` | по прикладу |
| `exceptions` | `items[]` = `{text, refers_to}` | по пункту |
| `traps` | `items[]` = `{uk, wrong, right, why}` | 1) `uk` + ✗ 2) ✓ + `why` |

`[[...]]` — виділення жовтим маркером. Якщо рушій з референсу чекає інші назви полів — напиши **адаптер у рендері**, JSON не змінюй. Частина 1 — слайди з `part: 1` (s1–s8), частина 2 — з `part: 2` (s9–s17).

## КРОК 3 · Фото з Unsplash (≤ 3 хв на все)

Слотів 5:

| Слот | `keywords` | `alt keywords` |
|---|---|---|
| `header` | `friends playing music` | `woman playing guitar` |
| `czytanie` (маркер `[IMAGE]` у розділі 1) | `man playing drums` | `drum set room` |
| `p1` | `man playing guitar home` | `woman listening music headphones` |
| `p2` | `friends running park` | `woman jogging alone` |
| `p3` | `woman cooking kitchen` | `man cutting vegetables` |

**Алгоритм — точно так, без варіацій:**

1. Якщо поруч з уроком уже є `pl-exam-01-pasje-images.lock.json`, візьми фото з нього й **жодного запиту до API не роби**.
2. Усі 5 слотів запитуй **паралельно** (`Promise.all`). Загальний дедлайн — 180 с від старту. Після дедлайну всі незакриті слоти отримують `missing`.
3. Запит на слот:
   ```
   GET https://api.unsplash.com/search/photos?query=<keywords>&per_page=10&orientation=landscape&content_filter=high
   Authorization: Client-ID ${UNSPLASH_ACCESS_KEY}
   ```
   Таймаут одного запиту — 10 с.
4. Візьми **перший** результат з `width >= 900`. Нічого не порівнюй і не оцінюй «на око».
5. Порожньо, таймаут або помилка → **один** повтор з `alt keywords`. Знову нічого → `status: "missing"`, урок публікується з порожнім поляроїдом. Більше 2 запитів на слот не роби.
6. Відповідь `401`, `403` або `429` (ключ або ліміт: демо-ключ має 50 запитів на годину) → **всі** незакриті слоти одразу `missing`. Без повторів і без очікування.
7. Фото **не завантажуй** до себе — використовуй URL з API (hotlink, так вимагають правила Unsplash):
   `urls.raw + "&w=1200&fit=max&auto=format"`. `fit=max` не обрізає кадр. Параметр `ixid` в URL не видаляй.
8. Для кожного взятого фото один раз зроби `GET links.download_location` з тим самим `Authorization` (так Unsplash рахує використання; таймаут 5 с). Помилку ігноруй.
9. Підпис під фото: `Photo: {user.name} / Unsplash`, де ім'я веде на `user.links.html`, а «Unsplash» — на `https://unsplash.com`. До обох посилань додай `?utm_source=werba_way&utm_medium=referral`.
10. Запиши `pl-exam-01-pasje-images.lock.json`:
    ```json
    { "header": { "status": "ok", "photo_id": "…", "url": "…", "author": "…", "author_url": "…", "download_location": "…" },
      "p3": { "status": "missing" } }
    ```
    Lock-файл комітиться разом з уроком. Повторні збірки до API не ходять.

## КРОК 4 · Аудіо (TTS, 5 хв)

Голоси `pl-PL-female` / `pl-PL-male`, швидкість у плеєрі за замовчуванням **0.85** (рівень A2).

| `audio_id` | Текст | Голос |
|---|---|---|
| `pl-exam-01-pasje-czytanie` | розділ 1: заголовок «Nowa pasja po trzydziestce» і 4 абзаци до маркера `[IMAGE]` (розминку не озвучувати) | male |
| `pl-exam-01-pasje-c1-dialog` | `comm-tasks.json#c1.model_dialogue`, 13 реплік | за полем `voice` кожної репліки |
| `pl-exam-01-pasje-e2-1` … `-e2-6` | `exam.json` → `e2.items[n].dialogue` | за полем `voice` |

Числа в текстах уже записані словами — не перетворюй їх на цифри. Для `e2` `max_plays: 2`.

## КРОК 5 · Збірка сторінки (8 хв)

Кожен маркер у `.md` → компонент:

| Маркер | Розділ | Компонент |
|---|---|---|
| `[IMAGE: keywords="man playing drums" …]` | 1. Czytanie | поляроїд, слот `czytanie` |
| `[AUDIO: id="pl-exam-01-pasje-czytanie" …]` | 1. Czytanie | касета, без `max_plays` |
| `[EXERCISE: …exam.json, blocks="e1"]` | 2. Pytania do tekstu | бланк «Jak na egzaminie», `true-false` |
| `[EXERCISE: …vocab.json]` | 3. Słownictwo | `vocab-cards` |
| `[EXERCISE: …pictures.json]` | 5. Opis zdjęć | `picture-set` |
| `[EXERCISE: …comm-tasks.json]` | 6. Zadania komunikacyjne | `flip-task` |
| `[AUDIO: id="pl-exam-01-pasje-c1-dialog" …]` | 6 | касета під карткою `c1` |
| `[EXERCISE: …exam.json, blocks="e2"]` | 6 | бланк «Jak na egzaminie», `multiple-choice`, касета в кожному елементі |
| `[SLIDES: …, part="1"]` | 7. Gramatyka, część 1 | кнопка «Otwórz prezentację» + iframe 16:9 |
| `[EXERCISE: …grammar.json, blocks="g1-g3"]` | 7 | g1, g2, g3 |
| `[SLIDES: …, part="2"]` | 8. Gramatyka, część 2 | як вище |
| `[EXERCISE: …grammar.json, blocks="g4-g7"]` | 8 | g4, g5, g6, g7 |
| `[EXERCISE: …hw.json]` | 10. Praca domowa | h1, h2, h3 |

Розділ «Cele lekcji» — блок цілей з чекбоксами; у розділі 9 той самий блок з «Sprawdzam się». Słowniczek — компонентом. Розділ 4 (питання з курсивними опорами) — звичайний текст зошита. `teacher.md` у Notion — окрема сторінка тільки для викладача, учням не публікується.

## КРОК 6 · Перевірка (обов'язкова, ≤ 5 хв на прогін)

Усе запускається локально на preview. Урок не вважається готовим, поки всі пункти не зелені.

1. Ще раз `python3 scripts/check_lesson_package.py …` — 0 `ERROR`.
2. `scripts/validate_lesson.py` проєкту — проходить.
3. e2e-тест:
   ```bash
   npm i -D @playwright/test && npx playwright install chromium   # один раз
   LESSON_DIR=content-queue/lectures/<папка>/pl-exam-01-pasje \
   LESSON_URL=<preview-url уроку> \
   SLIDES_URL=<preview-url>/slides/pl-exam-01-pasje \
   npx playwright test tests/lesson-exercises.spec.ts --reporter=line --retries=1
   ```
   Тест проходить **кожен елемент кожної вправи**: неправильна відповідь → `wrong` і не блокує; правильна → `correct`; `explanation` видно; усі `accept[]` зараховуються; відповідь без огонків → `correct-no-diacritics`; кнопки `options[]` = JSON (ловить баг дублювання); аудіо рахує `max_plays` і гасне; картки перевертаються; фото не обрізані; немає нерозгорнутих маркерів і помилок у консолі; усі 17 слайдів відкриваються; нотатки видно лише з `?teacher=1`.
4. Тест червоний:
   - через **компонент** (немає атрибута, не той стан, баг) → виправ компонент і запусти тест знову. Таких кіл — максимум 2.
   - через **зміст** (наприклад, правильна відповідь не зараховується, бо в JSON помилка) → нічого не виправляй, запиши у «ПОМИЛКИ В КОНТЕНТІ».
   - тест сам не змінюй. Якщо він, на твою думку, хибний — опиши це у звіті.
5. Відкрий урок на ширині 390 px (телефон): закладки зверху, нічого не виходить за край.

## Таймбокси

| Етап | Ліміт |
|---|---|
| КРОК 0 | 2 хв |
| КРОК 1 (компоненти) | окремо, у звіті окремим рядком |
| КРОК 2–5 (урок від архіву до preview) | 20 хв разом |
| КРОК 3 (фото) | 3 хв усередині цих 20 |
| КРОК 6 (один прогін тестів) | 5 хв, максимум 2 кола виправлень |
| Зовнішня помилка (API, TTS, деплой) | 1 повтор, далі — у звіт |

## Звіт — тільки в цій формі, без переказу процесу

```
УРОК: pl-exam-01-pasje
PREVIEW: <url уроку> · <url презентації>
ЧАС: урок … хв · компоненти … хв · тести … хв
КРОК 0: check_lesson_package — 0 ERROR / … WARN (список WARN)
КОМПОНЕНТИ: зроблено: … · виправлено баг options: так/ні · не зроблено: …
ФОТО: header ok/missing · czytanie … · p1 … · p2 … · p3 … · lock-файл: так
АУДІО: czytanie · c1-dialog · e2-1…e2-6 — ok/помилка
МАРКЕРИ: нерозгорнутих 0
ПЕРЕВІРКА UI: playwright … passed / … failed (назви червоних тестів)
ЗАЛИШИЛОСЯ: …
ПОМИЛКИ В КОНТЕНТІ: файл · id · що не так
```
