# docs/ — карта документації Werba Way

**Це єдине джерело правди.** Інші акаунти Claude беруть документи звідси, не з claude.ai Project.
Репо публічне: `https://github.com/jurijteacher-cell/WerbaWay` · сирі файли `https://raw.githubusercontent.com/jurijteacher-cell/WerbaWay/main/docs/<ФАЙЛ>.md`

Стара версія документів у Project, Notion і локальних копіях **не чинна**. Суперечність — назви в чаті.

## Старт для нового агента (інший акаунт, без доступу до воркспейсу)

1. `git clone https://github.com/jurijteacher-cell/WerbaWay` (або `WebFetch` raw-посилання нижче) і прочитай `CLAUDE.md`.
2. Прочитай `docs/LESSON_PROTOCOL.md` і `docs/GRAMMAR_METHOD.md`; решту — за таблицею.
3. Для запису (push у `main`) потрібен доступ до репо; без нього — віддай готові файли в чат і назви причину.

## Що читати для якого завдання

| Завдання | Файли (≈ токенів) |
|---|---|
| **Черга, відкриті пункти, учні, голоси** | `STATE.md` (оновлювати в кожній сесії) |
| **«Роби telc»** (пробний іспит telc) | `TELC_PLAYBOOK.md` |
| **«Роби б1»** (пробний державний B1) | `B1_PLAYBOOK.md` |
| **Нова лекція** | `LESSON_PROTOCOL.md` (~8k) · `GRAMMAR_METHOD.md` (~3k) · карта модуля · `ref/<тема>.md` |
| Схеми JSON вправ | `CONTENT_SPEC.md` (~4k; лише потрібні типи) |
| Слухання, озвучення | `AUDIO_SITE.md` · формати іспитів: `AUDIO_EXAM_SPEC.md` |
| Новий тег граматики | `GRAMMAR_REGISTRY.md` |
| Публікація не пройшла / новий агент | `SITE_PUBLISHING.md` (~3k) |
| Багатомовність сайту й лекцій | `I18N.md` |
| Переклад (для субагента) | `I18N_TRANSLATION_BRIEF.md` |
| Вигляд UI, код компонентів | `DESIGN_SYSTEM.md` |
| Клас, чат, дошка | `CLASS_TOOLS_SPEC.md` · `CLASS_TOOLS_CHANGELOG.md` |
| Результати вправ, акаунти | `EMBED_RESULTS.md` · `AUTH_SETUP.md` · `PROGRESS_SPEC.md` |
| Пробні іспити, placement | `MOCK_EXAM_SPEC.md` · `PLACEMENT_SPEC.md` · `EXAMS_TELC_vs_PANSTWOWY_B1.md` |
| Стартові курси A0–A1, формат «Podróż» | `LESSON_PROTOCOL_A0-A1.md` · `IMMERSION_QUEST.md` |

## Карти курсів

`CURRICULUM_MASTER_A0-B2.md` (головна) · `CURRICULUM_A0-A1.md` · `CURRICULUM_A2.md` · `CURRICULUM_GROUP_B1.md` · `CURRICULUM_GROUP_B2.md` · `CURRICULUM_GRAMMAR_B1-B2.md` · `CURRICULUM_TELC_B1.md` · індивідуальні: `CURRICULUM_PL-KSIEG`, `PL-TRENER`, `PL-NIER`, `PL-REMONT`, `MODULE_PL-KP`.

## Довідники по темах (`ref/`)

Повні перевірені довідники (відмінки, чергування, дієвідміни…) — складаються один раз пошуком і далі використовуються всіма лекціями. Перед написанням порції граматики: `ls docs/ref/`. Немає — склади, закоміть, потім пиши лекцію. Формат — `ref/README.md`.

## Правила супроводу документації

- Правка правила = правка файлу в `docs/` + коміт у `main`. Копій немає: однойменні файли в claude.ai Project — лише вказівники сюди, їх вміст не правиться.
- Будь-яка зміна контексту (рішення, протокол, специфікації, карти курсів, статус уроків) вноситься тут і пушиться в `main` у тій самій сесії; див. правило 10 у `CLAUDE.md`.
- Файл — без історії патчів («v3.x додав…»): лише чинне правило; дата й причина — одним рядком у шапці. Історія — у git.
- Новий документ — у таблицю вище. Застарілий — у `archive/`.
- Документ описує лише те, що існує в репо (команди, скрипти); перевіряй `ls scripts/` і `package.json`.
