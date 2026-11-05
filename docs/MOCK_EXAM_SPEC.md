# Egzamin próbny B1 — `mock-exam`

Пробний іспит B1 (модулі **Rozumienie tekstów pisanych** + **Poprawność gramatyczna**) з іменем учня і записом результату в Notion.

- Контент: `src/content/queue-published/{id}-mock.json` (`pl-b1-probny-01`, `pl-b1-probny-02` — Egzamin 1 і 2 з «Polski na B1», B. Wilczyńska).
- Учень: `https://werba-way.vercel.app/embed/{id}/mock-exam` (можна `?imie=Ім'я`). Без логіну.
- Збереження: стан спроби (ім'я, відповіді, вкладка) і після відправлення сам результат лежать у `localStorage` браузера учня (`werba-mock:{id}`). Закрив embed — відкриває там само або бачить свій результат. Кнопка «Rozwiąż jeszcze raz» очищає. Інший пристрій / інкогніто — з нуля.
- Notion: сторінки учня — модуль «Державний іспит B1» (`pl-b1-cert`), уроки `01 · Egzamin próbny B1 — 1`, `02 · …`, сторінка `TEACHER · Egzamin próbny B1 — 1 i 2`.
- API: `GET /api/mock-exam/{id}` — завдання без ключів; `POST /api/mock-exam/{id}/finish` `{imie, answers, minutes}` — перевірка на сервері, рядок у Notion, відповідь з балами й правильними відповідями.
- Notion: база «Wyniki — egzamin próbny B1» (`NOTION_MOCK_DATABASE_ID`, за замовчуванням `8e2ceb755dc1451cada978409be51369`) на сторінці «Egzamin próbny B1» у Werba Way. Інтеграція `NOTION_API_KEY` мусить мати доступ до цієї сторінки (••• → Connections).
- Рядок: Imię, Egzamin, Wynik (поріг 60% у кожній частині), Czytanie/Gramatyka (pkt), Razem %, Do sprawdzenia, Słabe tematy (завдання < 60%), Błędy (стисло), Czas; у тілі сторінки — кожна помилка: що відповів учень і як правильно.

## Формат JSON
`sections[] → tasks[]`, `layout`:
- `mc-passages` — `items[{passage, stem, options[], answer: a|b|c}]`
- `true-false` — `passage`, `items[{text, answer: TAK|NIE}]`
- `cloze` — `text` з `{{ex}}`, `{{1}}`…; `gaps[{n, kind: options|bank|input, options?, answer?, accept?, display?}]`; банк фрагментів `bank[{key,text}]` або слів `bank_words[]`
- `matching` — `right[{key,text}]`, `items[{text, answer: key}]`
- `questions` — `items[{sentence (підкреслення __…__), after, reply, accept[]}]`
- `transform` — `items[{sentence, keyword, model, accept[]}]`; збіг з `accept` = 1 p., інакше «Do sprawdzenia» (0 p., викладач перевіряє вручну)

`example` у кожному завданні показується як розв'язаний зразок і не рахується. Відкриті відповіді: регістр, пунктуація, лапки не важать; без польських знаків — зараховано з позначкою. `points_per_item` — як у книжці (сума 30 + 30).
