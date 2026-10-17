# Werba Way — SPEC PATCH v3.6 (2026-10-17)

Одна зміна до v3.5: **словник уроку живе тільки в Quizlet.** Інтерактивні картки LMS (`vocab-cards`, `/embed/{lesson_id}/vocab`) для нових лекцій більше не публікуються.

Діє для всіх лекцій, створених після 2026-10-17. Старі лекції не переробляємо.

## 1. Хто що робить

| Крок | Хто |
|---|---|
| Список слів (20–25 для light-60, за таблицею рівня для інших) | Claude, як і раніше, у `{id}-vocab.json` |
| Набір у Quizlet: назва `{lesson_id-коротко} · {title}`, імпорт «термін Tab переклад», видимість «Відкритий» | Claude через браузер у Quizlet-акаунті Юри |
| Маркер `[QUIZLET: …]` у розділі «2. Słownictwo» | Claude |
| Вбудовування набору в Notion | Cursor |

## 2. Маркер у `.md`

У розділі `## 2. Słownictwo` замість `[EXERCISE: … type="vocab-cards"]`:

```
[QUIZLET: set_id="1223449895", url="https://quizlet.com/1223449895/flashcards/embed", title="Słownictwo — Quizlet"]
```

## 3. `{id}-vocab.json`

Файл лишається в пакеті як **джерело слів** (для імпорту в Quizlet, Słowniczka і валідатора). **Технічно обов'язково:** копія `{id}-vocab.json` має лежати в `src/content/queue-published/` — LMS (`getQueueBundle`) без неї віддає 404 на всі вправи уроку (comm-tasks, grammar, hw, slides). Embed `/vocab` при цьому в Notion не вставляється. Нові поля верхнього рівня:

```json
"publish": "quizlet",
"quizlet_set_id": "1223449895",
"quizlet_url": "https://quizlet.com/1223449895/flashcards/embed"
```

## 4. Правила для Cursor

- Якщо у `vocab.json` стоїть `"publish": "quizlet"` або в `.md` є маркер `[QUIZLET: …]`:
  - **не** публікуй `/embed/{lesson_id}/vocab` і **не** генеруй TTS для словника;
  - у Notion встав набір як справжній embed-блок, ніколи як посилання:
    `<embed src="https://quizlet.com/{set_id}/flashcards/embed">Słownictwo — Quizlet</embed>`
- Перевірка перед «опубліковано»: у розділі «2. Słownictwo» немає `werba-way.vercel.app/embed/{lesson_id}/vocab`.
- Набори в Quizlet Cursor не створює і не редагує.

## 5. Słowniczek

Таблиця «Słowniczek» у кінці лекції лишається, поки Юра не вирішить інакше.
