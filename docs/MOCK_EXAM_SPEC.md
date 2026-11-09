# Пробні іспити — `mock-exam` (v2)

Рушій пробних іспитів: слухання з обмеженим прослуховуванням, читання, граматика / мовні елементи, письмо на перевірку викладачем. Перевірка на сервері, рядок у Notion, миттєвий розбір помилок для учня.

## Іспити, які вже є

| Lesson ID | Що це | Бали | Поріг |
|---|---|---|---|
| `pl-b1-probny-01` | Державний B1 — 1 (Wilczyńska, czytanie + gramatyka) | 30 + 30 | 60% у кожній частині |
| `pl-b1-probny-02` | Державний B1 — 2 (Wilczyńska, czytanie + gramatyka) | 30 + 30 | 60% |
| `pl-b1-probny-03` | **Державний B1 — 3**, повна письмова частина: słuchanie, czytanie, gramatyka, pisanie | 30 + 30 + 30 + письмо вручну | 50% у кожній частині |
| `pl-telc-probny-01` | **telc B1·B2 — 1**: słuchanie, czytanie, elementy językowe, e-mail | 23 + 18 + 18 = 59 | рівень: B1 від 27, B2 від 43 |

Контент: `src/content/queue-published/{id}-mock.json`. Учень: `https://werba-way.vercel.app/embed/{id}/mock-exam` (можна `?imie=Ім'я`), без логіну.

Стан спроби (ім'я, відповіді, вкладка, лічильник прослуховувань) і готовий результат лежать у `localStorage` браузера учня (`werba-mock:{id}`). Інший пристрій або інкогніто — з нуля.

## API

- `GET /api/mock-exam/{id}` — завдання без ключів і без транскриптів.
- `POST /api/mock-exam/{id}/finish` `{imie, answers, minutes}` → `{score, transcripts, notionSaved}`. Перевірка тільки на сервері.
- `GET /api/health` → `{commit, env, notion_key}` — який коміт живий і чи бачить сервер ключ Notion. Значення ключа ніколи не віддається.

## Змінні оточення

Ключ інтеграції Notion читається з будь-якої з трьох назв: **`NOTION_API_KEY`**, `NOTION_TOKEN`, **`NotionAPI`** (саме так він названий у Vercel-проєкті werba-way, Production + Preview + Development). Vercel підхоплює змінну лише після нового білду — push або Redeploy.

База результатів: `NOTION_MOCK_DATABASE_ID`, за замовчуванням `8e2ceb755dc1451cada978409be51369` («Wyniki — egzamin próbny»). Інтеграція мусить мати доступ до сторінки (••• → Connections).

## Рядок у Notion

Imię · Egzamin · Wynik (для telc — рівень B1/B2/poniżej B1; для державного — Zdane / Poniżej progu) · Słuchanie / Czytanie / Elementy / Gramatyka (pkt) · Razem % · Do sprawdzenia · Słabe tematy · Błędy (стисло) · Czas · Lesson ID.

У тілі сторінки: підсумковий callout, кожна помилка (що відповів учень і як правильно), а наприкінці — тексти письмової частини з лічильником слів і темою, яку учень вибрав. Секції `manual` у розбір помилок не потрапляють.

## Формат JSON

### Рівень іспиту
```
lesson_id, exercise_type: "mock-exam", exam_label, title, subtitle, source, pass_ratio
eyebrow?      — надпис над заголовком ("egzamin próbny · telc B1·B2")
rules?        — список правил на вкладці «Start» (замінює дефолтні)
scoring?      — "per-section" (дефолт) | "telc"
levels?       — для telc: {"B1": 27, "B2": 43}
```
При `scoring: "telc"` бали всіх неручних секцій додаються в один тест, і замість «склав / не склав» виводиться рівень.

### Секція
```
id, tab, title, minutes, tasks[]
manual?: true        — оцінює викладач: не рахується в бал і в поріг
manual_points?       — скільки балів вона варта на справжньому іспиті
```

### Завдання
`layout`:
- `mc-passages` — `items[{passage?, stem, options[], answer: a|b|c}]`. Елемент із `kind: "tf"` малюється як два кнопки замість варіантів (`answer` — текст мітки).
- `true-false` — `passage`, `items[{text, answer}]`
- `cloze` — `text` з `{{ex}}`, `{{1}}`…; `gaps[{n, kind: options|bank|input, options?, answer?, accept?, display?}]`; банк `bank[{key,text}]` або `bank_words[]`
- `matching` — `right[{key,text}]`, `items[{text, answer: key, emoji?}]`
- `questions` — `items[{sentence (__підкреслення__), after, reply, accept[]}]`
- `transform` — `items[{sentence, keyword, model, accept[]}]`; не збіг з `accept` → «Do sprawdzenia» (0 p., перевіряє викладач)
- `writing` — `choices[{id, label, intro?, parts[{id, label, prompt, words?}]}]`; учень вибирає один варіант, лічильник слів показує межі ±10%. Відповіді лежать у ключах `{task}:choice` і `{task}:{part}`.

Додаткові поля завдання:
```
audio?: {src, max_plays, note?}   — плеєр без перемотки; після відправки обмеження знімається
transcript?                       — текст запису, віддається тільки після /finish
tf_labels?: ["prawda","fałsz"]    — мітки замість TAK/NIE
start_n?                          — номер першого пункту (наскрізна нумерація telc)
reuse_keys?                       — один ключ можна ставити кільком пунктам
left_label? / right_label?        — заголовки колонок у matching
```

`example` у кожному завданні показується як розв'язаний зразок і не рахується. Відкриті відповіді: регістр, пунктуація й лапки не важать; без польських знаків — зараховано з позначкою.

## Аудіо

Файли: `public/audio/{lesson_id}/*.mp3`, у JSON шлях `/audio/{lesson_id}/файл.mp3`. Моно, 64 kbit/s, гучність вирівняна (`loudnorm`).

Як робилися записи: ElevenLabs `eleven_v3`, один запит на кожного мовця (репліки через `[long pause]`), нарізка за мітками часу Whisper (`tools/align_split.py` у сесійному скретчпаді), склейка ffmpeg з паузами, телефонний фільтр для голосових повідомлень. Перевірка: кожен відрізок транскрибується назад і звіряється зі сценарієм. Вартість повного іспиту ≈ 12 тис. кредитів ElevenLabs (≈ $2,5).

Повторення всередині запису (державні завдання 2 і 5 звучать двічі) вшиті у файл, тому `max_plays: 1` — учень вмикає один раз.
