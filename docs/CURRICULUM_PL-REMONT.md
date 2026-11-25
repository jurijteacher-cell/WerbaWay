# pl-remont — «Польська для ремонтів», A2 (карта модуля)

**Учень:** майстер, який робить внутрішні ремонти (łazienka, kuchnia, przedpokój). Рівень A2. Мета: говорити з клієнтом, колегою й продавцем у будівельному магазині: оцінка, матеріали, терміни, робота, проблеми, відбір робіт.
**Формат:** індивідуально, 8 уроків × 60 хв, шаблон `light-60 A2`. Мова глос — українська (`Pułapki z ukraińskiego`). TEACHER — українською.
**Де живе модуль:** **лише сайт** (`module: pl-remont`, «Польська для ремонтів»). Notion не ведемо (рішення Юри, 21.11.2026 і 24.11.2026). Сторінки Notion, створені 24.11.2026 до цього рішення (модуль і урок 01), застарілі й не оновлюються.
**LMS:** `lesson_id` = `pl-remont-{NN}-{slug}`; JSON у `src/content/queue-published/`; сторінки `src/content/pages/` і `src/content/teacher-pages/`; сценарій аудіо `src/content/audio/`; запис у `content-queue/_manifest.json` (`course_order` = № уроку). Переклади ru/pl/en — у тому ж пуші.

## Уроки

| № | lesson_id | Тема | Граматика | Статус |
| --- | --- | --- | --- | --- |
| **Блок A — оцінка й домовленості** | | | | |
| 01 | `pl-remont-01-wycena-lazienki` | Ile to będzie kosztować? Wycena remontu | trzeba, muszę, powinien, nie trzeba vs nie wolno, часи trzeba | на сайті |
| 02 | `pl-remont-02-sklep-budowlany` | Co trzeba kupić? Materiały i ilości | числівники + іменник, родовий мн./одн. після кількості, potrzebować + G | на сайті |
| 03 | _(slug при створенні)_ | Kiedy skończymy? Terminy i harmonogram prac | будущий час, прийменники часу, od … do, za + A | план |
| **Блок B — робота** | | | | |
| 04 | _(slug при створенні)_ | Ściany i sufity: skuwanie, szpachlowanie, malowanie | наказовий спосіб, послідовність (najpierw, potem) | план |
| 05 | _(slug при створенні)_ | Podłoga i płytki | порівняння, przymiotniki, dopasowanie | план |
| 06 | _(slug при створенні)_ | Łazienka i kuchnia: hydraulika i montaż | czas przeszły dokonany/niedokonany | план |
| **Блок C — клієнт і здача** | | | | |
| 07 | _(slug при створенні)_ | Rozmowa z klientem: zmiany, problemy, dodatkowe koszty | umowny спосіб (mógłbym, chciałbym), jeśli | план |
| 08 | _(slug при створенні)_ | Odbiór prac, reklamacje i BHP | strona bierna в значенні «zrobione», nie wolno / trzeba | план |

Граматичні теми уроків 02–08 — чернетка; перед створенням кожного уроку звіряй її з `docs/GRAMMAR_REGISTRY.md` і бери теги лише з реєстру.

## Правила модуля

- Тексти — теж вправи: ordering, detektyw і cloze-text у кожному уроці (CLAUDE.md, 21.11.2026).
- Аудіо — завжди (сайт озвучує): `-czytanie.mp3` і діалог до c1 (`-c1-dialog.mp3`, `mode: listen-then-play`).
- Голоси: Narrator — `mQq2zdGT1zEfDbh8W95l`, чоловічий (Artur, Marek) — `bwhymd1UcFEihyvPSEoR`, жіночий (Joanna, Ewa) — `gHGjEjdr2LBds0XHTsvg`. Нові ролі — з тих самих трьох голосів, нові голоси — лише з `creative_list_voices`.
- Персонажі модуля: pani Joanna Lis (клієнтка, Gdańsk), pan Artur (fachowiec, урок 01), pan Marek (fachowiec, c1), pani Ewa (клієнтка, c1), pani Ilona (sprzedawczyni, урок 02, c1). Усі вигадані.
- Нова граматика, якої немає в реєстрі, вимагає рядка в реєстрі до уроку.
- `number:` у шапці = № у карті модуля; змінюєш порядок — міняй і тут, і в `number:`, і в `course_order` маніфесту.

## Урок 01: що вже є

JSON: vocab (22 слова), grammar (t1–t3 і g1–g7), comm-tasks (c1–c3, c1 з аудіо), exam (e1), hw (h1–h3). Сторінка учня, TEACHER, аудіо-сценарій, маніфест, переклади ru/pl/en.

## Урок 02: що вже є

JSON: vocab (24 слова), grammar (t1–t3, w1, g1–g8, gz), comm-tasks (c1–c3, c1 з аудіо), exam (e1), hw (h1–h3). Довідник `docs/ref/quantity-genitive.md`. Сторінка учня, TEACHER, аудіо-сценарій, маніфест, переклади ru/pl/en. Відео для ДЗ не підібрано.
