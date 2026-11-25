# SITE_PUBLISHING — як лекція потрапляє на сайт (v2.0, 24.11.2026)

Читати лише коли публікація не пройшла або ти новий агент у репо. Зміст і стиль лекції — `LESSON_PROTOCOL.md`; вигляд UI — `DESIGN_SYSTEM.md`. Notion не ведемо; опис Notion-імпорту й старих маршрутів — `docs/archive/SITE_PUBLISHING_v1.1.md`.

## 1. Сайт

Репо `jurijteacher-cell/WerbaWay` (публічне) · Next.js 14 App Router + TypeScript + Tailwind + Supabase (Auth/Postgres/RLS) · push у `main` → Vercel деплоїть сам (1–2 хв) · прод `werbaway.com` (= `werba-way.vercel.app`; embed-посилання в `.md` пишуться на vercel-домен, рендер зрізає їх до відносних). Контент — файли в репо, **не база**; Supabase тримає людей, доступи, відповіді, прогрес.

Маршрути: `/learn` · `/learn/<slug>` (лекція-блокнот, `?step=` керує викладач у класі) · `/learn/<slug>/hw` · `/embed/<lesson_id>/<type>` · `/teacher/lesson/<slug>` · `/class` · `/words` · `/audio/*.mp3`.

## 2. Де що лежить

```
src/content/pages/<slug>.md              сторінка учня
src/content/teacher-pages/<slug>.md      TEACHER (teacherOf: <slug>)
src/content/queue-published/<id>-*.json  вправи: vocab, grammar, hw, comm-tasks, exam
src/content/audio/<id>.json              сценарій озвучення
src/content/i18n/pages|exercises/…       переклади (ru, pl, en) — карти { ключ: переклад }
content-queue/_manifest.json             реєстр опублікованих уроків
content-queue/audio-ready.json           { lesson_id: [audio_id…] } — аудіо з ready: true
content-queue/audio-pending/             блоки слухання, що чекають аудіо
docs/ · scripts/ · supabase/migrations/
```

**Лекція «є на сайті»** = сторінка + TEACHER + `vocab`/`comm-tasks`/`hw` (+ `grammar`/`exam`, на які є embed) + запис у маніфесті + переклади. Без першого — лекції немає на сайті (була аварія з уроками 65–66); без JSON — вікно порожнє.

## 3. Slug

`slug` = `lesson_id` з адрес вправ, `^[a-z0-9][a-z0-9-]*$`. Готову лекцію не перейменовувати (злетять embed, прогрес, посилання); порядок у курсі — поле `number`.

## 4. Формат сторінки учня

```markdown
---
title: 53 · Z kim pracuję
icon: 🗂️
level: A2
number: 53
module: pl-a2
moduleTitle: Польська A2
cover: https://images.unsplash.com/photo-…?w=1600&q=80&fm=jpg&fit=max
glossLang: ru        # лише якщо пояснення не українською
---
```

`number` — порядок у `/learn`; `module` — на ньому тримається доступ по курсу; `cover` — ландшафт Unsplash.

**Категорії (модулі) і порядок на `/learn` (25.11).** Одна категорія = один `module` + один `moduleTitle` (однаковий у всіх уроках модуля). Порядок категорій задає `COURSE_RANK` у `src/lib/pages/pages.ts`: A0–A1 → A2 → B1 і граматика (`pl-b1-group`, `pl-gram-*`, `pl-bledy`) → професійні курси (`pl-ksieg`, `pl-nier`, `pl-trener`, `pl-preg`, `pl-remont`, `pl-arch`, `pl-b1-auto`, `pl-prawko`) → підготовка до іспитів (`pl-telc-b1`) → пробні іспити (`pl-telc-probny`, `pl-b1-cert`). Новий модуль без запису в `COURSE_RANK` падає в кінець — додай його в потрібну групу в тому ж коміті.
- **Іспити — лише іспити.** `pl-telc-probny` (пробні telc B1·B2, 01–06) і `pl-b1-cert` (державний B1, 01–07): сюди йдуть тільки пробні іспити (`mock-exam`), нумерація 1…N підряд без пропусків, заголовок `0N · Egzamin próbny …`. Підготовка (звичайні уроки під telc) — окремий модуль `pl-telc-b1`; розбір помилок з листів — `pl-bledy`. Звичайний урок в іспитний модуль не кладемо.
- **Нумерація.** `number` — порядок усередині модуля за картою курсу (`docs/CURRICULUM_*.md`); вставка між двома — дробове (`71.5`). `level` у шапці обов'язковий (A0/A1/A2/B1/B2) — картка показує «level, урок N».
- **Назва категорії перекладається** (`moduleTitle` — кирилиця в шапці → одиниця i18n): після зміни чи нової категорії дописати переклади ru/pl/en у `src/content/i18n/pages/<slug>.<lang>.json` для кожного уроку модуля, інакше `i18n-coverage` ✗.
- **«Дивитися учня» без блимання (25.11).** Вправа, що зберігає стан, читає його з `embed-progress` (`usePersistentState` або `loadProgress`) і додає `useLiveTick()` у залежності ефекту відновлення — тоді відповіді учня підставляються в уже відкриту вправу «на місці». Перемонтовувати вправу (key/gen) у спостерігача заборонено: екран смикається.
- **Доступ.** `student_access` (kind `module`) тримається на коді модуля: при створенні нового модуля видати його тим учням, які мали попередній (перенос модуля = `INSERT … SELECT` з їхніх старих грантів).

Тіло — markdown:
- Усе до першого `---`, якщо містить «potrafisz» → картка цілей. Не ламати зачин.
- `## 📖 1. Czytanie` → розділ (число — у кружечок навігації); нумерація підряд.
- Розділ з `Praca domowa` / `домашн` / `homework` у назві → окрема сторінка `/hw`.
- Плашки: `<aside class="lp-callout" data-tone="green|yellow|purple|gray"><span class="lp-callout-icon" aria-hidden="true">🎯</span><div class="lp-callout-body">…</div></aside>`. Кольорові `<span>` і Notion-синтаксис не рендеряться.
- Таблиці GFM заповнені; чекбокси `- ☐`; фото `![… Fot. Автор / Unsplash](…)`; відео `<video source="https://www.youtube.com/watch?v=ID">…</video>`; вправа `<embed source="https://werba-way.vercel.app/embed/<id>/<type>?blocks=g2-g3">Підпис</embed>`.

**Як лекція ріжеться на сторінки (`buildPages()`):** цілі → окрема сторінка; далі в кожному розділі текст накопичується, і **кожна локальна вправа закриває сторінку** (текст перед нею + вправа). Це ж — кроки заняття в класі. Тому ритм «текст → вправа → текст → вправа»; три вправи поспіль дають три порожні сторінки, 2000 слів перед однією вправою — нечитабельну. Це ж узгоджується з циклом порцій `GRAMMAR_METHOD.md`.

## 5. Вправи

JSON за `CONTENT_SPEC.md`; `?blocks=` посилається на існуючі `block_id`. Кольори в embed — лише `nb-*` / `--nb-*` (`npm run check:embed-theme`, також `prebuild`). Нові типи вправ мають DOM-контракт `data-block-id`, `data-item-id`, `data-state`, `data-role`.

## 6. Доступ

`profiles.role='teacher'` бачить усе. Учень — якщо відкрито курс (`student_access.kind='module'`, `ref = module`), або лекцію (`kind='lesson'`), або він її пройшов (`lesson_progress`). Нова лекція в курсі, відкритому учню, з'являється сама за `module`; неправильний `module` виглядає як баг сайту. Посилання `/s/<token>` відкриває одну лекцію гостю й після входу додає її учню.

## 7. Домашка

`lesson_progress` + `page_progress` (міграції `0022`, `0023`). Домашка задається **автоматично, коли пройдено ≥ 40 % сторінок лекції**: сторінка рахується і за кнопкою «Пройдено», і коли вона була на екрані учня ≥ 15 с (клас, де викладач гортає). Раніше було 20 % і лише за кнопкою.

> **Статус:** код і міграція `0023` лежать у гілці `feature/hw-40` і чекають застосування міграції в проді; до цього діє старе правило (20 %, кнопка).

## 8. Переклади (укр · рос · пол · англ)

Польське тіло не перекладається. Механізм — `docs/I18N_TRANSLATION_BRIEF.md`; ключі рахує `src/i18n/segment.mjs`. Команди: `i18n-extract` → переклад (субагенти) → `i18n-merge` → `i18n-coverage <lesson_id>`. «@hide» у кириличній комірці знімає рядок таблиці (пастка, що в цій мові не діє).

## 9. Публікація — одним комітом у `main`

```bash
python3 scripts/check_answers.py <id>          # 0 ERR
python3 scripts/check_tags.py --changed        # 0 невідомих тегів
python3 scripts/check_lecture.py <id>          # структура, цикл граматики, пастки, слухання
node scripts/i18n-coverage.mjs <id>            # ✓ ru, pl, en
npm run check:embed-theme && npx tsc --noEmit  # лише якщо чіпав код
git add src content-queue && git commit -m "lesson: <id> — сторінки, вправи, переклади"
git -c push.negotiate=true push origin HEAD:main
python3 scripts/check_embeds.py <id> --remote  # ✓
```

Після деплою відкрий `/learn/<slug>` і `/embed/<id>/hw` (браузер): видно завдання, а не 404. 503 при push — повторити; 403 — `add_repo(…, access=push)`.

## 10. Чого не робити

- Не казати «готово» без `check_embeds --remote` і відкритого вікна.
- Не перейменовувати `lesson_id`; не править схему Supabase заради однієї лекції.
- Не тягнути аудіо/фото з Notion — посилання протухають; файли живуть у репо або Supabase.
- Не вимикати `prebuild`-перевірку; не обходити `check_embed_theme`.
- Не вставляти в сторінку текст від учнів: HTML сторінок довірений і не фільтрується.
- Не класти готові уроки в claude.ai Project.
