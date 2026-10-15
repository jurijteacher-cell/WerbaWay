# 04 · Завдання: типи, піраміда, схеми

## Enum типів

`fill-in-blank` · `sentence-building` · `drag-and-drop` · `matching` · `vocab-cards` · `picture-set` · `flip-task` · `true-false` · `multiple-choice`
Презентація — окремий тип файлу `grammar-slides`, не вправа.

## Граматика — піраміда блоків

1. Розпізнавання — `fill-in-blank`.
2. Утворення форм — `matching`.
3. Узгодження / вибір форми — `fill-in-blank` з `options[]`.
4. Нюанс «А vs Б» — з `explanation` до кожної відповіді.
5. Трансформації за темами — `sentence-building`.
6. Питомо польська конструкція — `sentence-building`.
7. Зв'язний текст: одна історія на 5–6 речень — `drag-and-drop` з 2–3 словами-пастками в банку.
8. Винятки й пастки — з `explanation`.

## Обов'язкові правила для кожного завдання

- **`grammar_point`** у кожному елементі `grammar` і `hw` — лише зі списку `grammar_points` у frontmatter. Вигадувати теги в уроці не можна: на них тримається прогрес у Supabase.
- **`covers_slides`** у кожному блоці; кожен слайд, крім титульного, покритий хоча б одним блоком.
- **`accept[]`** — усі інші нормативні відповіді. Порядок слів LMS не нормалізує: кожен допустимий порядок вписується явно.
- **`explanation`** — обов'язково в блоках на нюанс, пастки, `true-false`, `multiple-choice`; показується після правильної відповіді рукописним «↳ …».
- **Id** унікальні в межах уроку, з префіксом файлу: `v` vocab · `p` pictures · `c` comm-tasks · `g` grammar · `h` hw · `e` exam · `t` test; слайди `s1, s2…`. Після публікації id не змінюється (виправлення = новий id, старий `retired_at`).
- Діакритика: режим `lenient` за замовчуванням (без огонків — зелене + підказка). `"diacritics": "strict"` лише там, де огонки — предмет вправи.
- LMS ігнорує регістр, зайві пробіли й кінцеві `. , ! ?`.

## Спільні поля верхнього рівня `.json`

`lesson_id` · `exercise_type` · `title` · `instruction` · `estimated_minutes`

## Форма `items[]` за типом

| Тип | Поля елемента |
|---|---|
| `fill-in-blank` | `text` (із `___`), `answer`, опц. `options[]`, `accept[]`, `explanation` |
| `sentence-building` | `prompt` (речення-джерело), `answer`, опц. `accept[]` |
| `matching` | `left`, `right` |
| `drag-and-drop` | `text` (із `___`), `answer` + на рівні блоку `bank[]` з усіма словами, включно з 2–3 пастками |
| `true-false` | `statement`, `answer` (`true`/`false`), `explanation` |
| `multiple-choice` | `question`, `options[]` (3 варіанти), `answer` (текст правильного), `explanation` |

## Файл з блоками (`grammar`, `hw`, `exam`, `test`)

```json
{
  "lesson_id": "pl-telc-b1-01-praca",
  "exercise_type": "fill-in-blank",
  "title": "Narzędnik: od rozpoznawania do tekstu",
  "instruction": "Osiem bloków w dwóch częściach.",
  "estimated_minutes": 40,
  "blocks": [
    {
      "block_id": "g1",
      "part": 1,
      "covers_slides": ["s2", "s3"],
      "exercise_type": "fill-in-blank",
      "title": "1. Rozgrzewka: kim jesteś z zawodu?",
      "instruction": "Wpisz właściwą formę.",
      "items": [
        { "id": "g1-1", "text": "Moja siostra jest ___ (pielęgniarka).", "answer": "pielęgniarką",
          "grammar_point": "narzednik-kim-czym" }
      ]
    }
  ]
}
```

## Презентація — `{id}-slides.json` (зафіксовано 2026-10-15)

```json
{
  "lesson_id": "…", "exercise_type": "grammar-slides", "title": "…", "parts": 2,
  "slides": [
    { "id": "s1", "part": 1, "section": "title", "kind": "title", "title": "…", "question": "…", "goal": "…", "teacher_note": "…" },
    { "id": "s2", "part": 1, "section": "teoria", "kind": "table", "title": "…", "reveal": "row",
      "headers": ["…"], "rows": [["…"]], "note": "…", "teacher_note": "…" }
  ]
}
```

| `kind` | Поля |
|---|---|
| `title` | `question`, `goal` |
| `table` | `headers[]`, `rows[][]`, `reveal: "row"` |
| `steps` | `bricks[]` = `{text, label}`, `result` |
| `compare` | `left` / `right` = `{title, lines[]}` |
| `examples` | `items[]` = `{tag, pl, uk}`, `reveal: "item"` |
| `exceptions` | `items[]` = `{text, refers_to}`, `reveal: "item"` |
| `traps` | `items[]` = `{uk, wrong, right, why}` |

Спільні поля: `id`, `part`, `section` (`title` · `teoria` · `wyjatki` · `pulapki`), `kind`, `title`, `teacher_note`; опц. `note` (стікер 📌, останній крок). Слайд «Strategia» (див. `05`) — `section: "teoria"`, зазвичай `kind: "steps"`. Якщо рушій чекає інші назви полів, Cursor пише адаптер у рендері, а JSON не змінює.

## Словник — `{id}-vocab.json`

```json
{
  "lesson_id": "…", "exercise_type": "vocab-cards", "title": "Słownictwo: …",
  "instruction": "…", "estimated_minutes": 20,
  "groups": ["Praca i zawody", "Rozmowa kwalifikacyjna"],
  "comm_groups": ["Rozmowa kwalifikacyjna"],
  "items": [
    { "id": "v01", "term": "etat", "group": "Praca i zawody", "part_of_speech": "rzeczownik, m.",
      "definition": "Stała praca z pełną liczbą godzin.", "example": "…", "translation_uk": "штатна посада" }
  ]
}
```
- `definition` — проста польська, без слів, складніших за саме слово.
- `example` — не з тексту лекції, фактично перевірений.
- `audio` Claude не пише — Cursor генерує вимову з `term`.

## Комунікаційні задачі — `{id}-comm-tasks.json`

```json
{
  "lesson_id": "…", "exercise_type": "flip-task", "title": "Zadania komunikacyjne: …",
  "instruction": "Odwróć kartę, przeczytaj sytuację i odegraj rozmowę.", "estimated_minutes": 20,
  "items": [
    { "id": "c1", "mode": "listen-then-play", "front_title": "…",
      "back_scenario": "… Najpierw posłuchaj przykładowej rozmowy, potem odegraj swoją z innymi szczegółami.",
      "back_checklist": ["Dowiedz się, …", "Zapytaj, …", "Poproś o …"],
      "model_dialogue": [
        { "speaker": "Rekruterka", "voice": "pl-PL-female", "line": "…" },
        { "speaker": "Kandydat", "voice": "pl-PL-male", "line": "…" }
      ] }
  ]
}
```
- Чекліст 3–5 пунктів, кожен — дія з дієсловом (*Dowiedz się, Zapytaj, Ustal, Poproś, Opisz*), не тема.
- `model_dialogue`: 10–14 реплік (light-60: 10–12), цільова граматика ≥4 рази, закриває весь чекліст, має конкретні цифри й назви для питань на слухання, числа словами.
- Кожна задача — ≥4 слова зі своєї `comm_group`. Група вказується в самій задачі полем `comm_group`.

## Опис фото — `{id}-pictures.json` (якщо увімкнено)

Одне фото на `item`, без пар і порівняння епох. Кожне — своє `question`: опис (хто, де, що робить, настрій) + припущення + думка. Під ним `helper_questions` — 3–4 короткі питання-опори, які ведуть учня по опису по черзі (хто? де? що робить? як почувається? а ти?), кожне ≤8 слів. Вони показані відразу, а не сховані: частина учнів говорить посередньо і без опор мовчить. `phrase_bank` — тільки тут (*Na pierwszym planie…*, *W tle…*, *Wygląda na to, że…*). Кожне зображення: `source: "stock"`, `image_keywords` (2–4 прості англійські слова, без років і брендів), `image_keywords_alt` — **інша, простіша сцена**, а не синонім. Сцена: 1–3 людини, одна дія, нейтральне тло, без тексту в центрі кадру.

## Екзаменаційні блоки — `{id}-exam.json`

```json
{
  "lesson_id": "…", "exercise_type": "true-false", "title": "Jak na egzaminie B1",
  "instruction": "…", "estimated_minutes": 12,
  "blocks": [
    { "block_id": "e1", "exam_skill": "czytanie", "exercise_type": "true-false", "source": "section:1",
      "title": "Czytanie: prawda czy fałsz?", "instruction": "…",
      "items": [ { "id": "e1-1", "statement": "…", "answer": false, "explanation": "…" } ] },
    { "block_id": "e2", "exam_skill": "sluchanie", "exercise_type": "multiple-choice",
      "source": "{id}-comm-tasks.json#c1.model_dialogue", "audio_id": "{id}-c1-dialog", "max_plays": 2,
      "title": "Słuchanie: …", "instruction": "Posłuchaj nagrania …",
      "items": [ { "id": "e2-1", "question": "…", "options": ["…", "…", "…"], "answer": "…", "explanation": "…" } ] }
  ]
}
```
- `e1`: 6 тверджень, 3–4 хибні; хибне спирається на конкретну деталь тексту, а не на загальний зміст.
- `e2`: 4 питання; правильну відповідь чути дослівно або перефразовано, дистрактори теж звучать у записі (інша година, інше місце).
- `max_plays` — скільки разів можна прослухати, як на іспиті.
- **Слухання з окремими записами** (держ. іспит zad. I, telc cz. 1): `"audio_mode": "per-item"` на рівні блоку, а в кожному елементі — свій `audio_id` і `dialogue[]` (1–3 репліки з `speaker` і `voice`). `max_plays` один на весь блок.
- `exam_part` у блоці (напр. `"panstwowy-sluchanie-1"`) і `covers_slides` (якщо блок покриває слайд «Strategia») — за потреби.

## Домашка — `{id}-hw.json` + `.md`

- `hw.json`: три блоки — словниковий, граматичний на повну форму, трансформації; кожен елемент з `grammar_point`.
- **Головне правило:** жодне речення, прізвище, приклад чи **факт** з уроку (включно зі слайдами) не повторюється; стаття — не на ту саму підтему; письмова тема не збігається з питаннями Praktyki mówienia.
- Відео й стаття перевіряються пошуком; не вдалося — прямо сказати в чаті.
- Письмо у форматі іспиту: звертання, закінчення, обов'язкові пункти, обсяг рівня (кількість пунктів — див. `05`).

## Тест — `{id}-test.json` (контрольна / пробний іспит)

Структура `blocks[]`, префікс `t`, усі речення нові.

| Блок | `exam_skill` | Контрольна | Іспит |
|---|---|---|---|
| `t1` | gramatyka | 10 завдань, кожен тег `rec` ≥2 рази | 16 |
| `t2` | slownictwo (`grammar_point: "slownictwo"`) | 4 | 8 |
| `t3` | czytanie, `source_text` 80–120 слів | 3 завдання | 2 тексти, 8 |
| `t4` | sluchanie, `dialogue[]` 8–10 реплік + `audio_id` + `max_plays` | 3 завдання | 2 діалоги, 8 |

У `t3`/`t4` `grammar_point` не пишеться. Mówienie й pisanie в JSON не входять — їх оцінює викладач рубрикою з `teacher.md`.

## Аудіо — маркер і швидкості

```
[AUDIO: id="…", source="tts", text="section:1 | {file}#{item}.model_dialogue", voice="pl-PL-female", speed="0.9"]
```
Голоси `pl-PL-female` / `pl-PL-male`. Швидкість: A2 `0.85`, B1 `0.9` (тексти) / `0.95` (діалоги). Для пробних іспитів — див. `05`.
