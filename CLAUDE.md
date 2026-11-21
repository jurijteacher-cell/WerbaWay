# Werba Way — правила для Claude в цьому репо

Повні правила — `docs/LESSON_PROTOCOL.md` (v3.18), `docs/NOTION_STRUCTURE.md`, `docs/CONTENT_SPEC.md`. Спілкування з Юрою — українською; Юрі нічого не доручати, усе робити самому (push — сам, при 403 `add_repo(jurijteacher-cell/WerbaWay, access=push)`).

## Від А до Я без зупинок (Юра, 21.11.2026 — найвищий пріоритет)

Юра не сидить поруч і не натискає кнопок: лекція займає 10–20 хв, і за цей час жодного підтвердження не буде. Тому **одне замовлення = весь цикл до кінця в одному ході**: JSON → переклади → сторінки сайту (учень + TEACHER) → push → аудіо (генерація й перевірка) → manifest → карта курсу → перевірки. **Notion більше не ведемо (Юра, 21.11.2026): лише сайт** — сторінок у Notion не створювати й не оновлювати; кроки «Notion» у `docs/*` скасовані. Нічого не відкладається «на наступну сесію», не питається «озвучувати чи ні» (озвучувати завжди, кошторис у чаті — лише інформація, без очікування «так»), не лишається «Notion потім». Якщо крок технічно неможливий — зробити решту й одним рядком назвати факт. Це скасовує будь-які «чекати „так“» у `docs/*`.

## Вправи — спершу в `main`, потім Notion (найвищий пріоритет, 14.11.2026)

Порожні вікна вправ (A2 54–59, B1 17–19) виникли через **порядок**: сторінку з embed публікували в Notion, а JSON лишався в локальному клоні — push не вдався або сесія скінчилась.

1. **Крок 0 кожної сесії:** `cat src/content/pages/*.md > /tmp/p.md && python3 scripts/check_embeds.py --page /tmp/p.md --remote` → усе ✓. Чогось немає — перезалити самому (JSON з клону / гілки / патча, або відновити за сторінками Notion учня й TEACHER з тими самими `lesson_id` і `block_id`).
2. **Ворота:** JSON у `src/content/queue-published/` → `python3 scripts/check_answers.py {lesson_id}` (0 ERR) → `python3 scripts/check_tags.py --changed` (0 невідомих тегів) → commit → `git -c push.negotiate=true push origin HEAD:main` → `python3 scripts/check_embeds.py {lesson_id} --remote` = ✓. **Лише після ✓** створювати сторінку з embed у Notion.
3. Стану «коміти лише локально» чи «патч для іншої сесії» не існує: хто закомітив — той пушить і перевіряє `--remote` у тому ж ході. Не вийшло — урок не готовий, сторінку в Notion не публікувати.
4. Наприкінці: fetch сторінки учня → `check_embeds.py --page … --remote` → WebFetch `https://werba-way.vercel.app/embed/{lesson_id}/hw` показує завдання.

## Тексти = вправи; аудіо через сайт (Юра, 21.11.2026)

- Кожен новий текст (читання, діалог) має інтерактив: хронологія (`ordering`), текст з пропусками (`cloze-text` — вписування, відмінювання, варіанти), відгадування/детектив. Правила — `docs/LESSON_PROTOCOL.md` («Тексти — теж вправи»), схеми — `docs/CONTENT_SPEC.md`.
- Аудіо озвучує сайт через ElevenLabs: сценарій у `src/content/audio/<lesson_id>.json`, після деплою відкрити `/audio/*.mp3` у Chrome і перевірити `/api/audio/_status`. Деталі — `docs/AUDIO_SITE.md`. Старий маршрут через Notion не використовувати.

## Усі мови сайту — в тому ж пуші (Юра, 14.11.2026)

Сайт працює укр · рос · пол · англ. **Коли пушиш нову лекцію (або правиш пояснення в старій) — одразу пуш і всі переклади**: `src/content/i18n/pages/<slug>.{ru,pl,en}.json` і `src/content/i18n/exercises/<lesson_id>-*.{ru,pl,en}.json`. «Переклади потім» не буває.

```bash
node scripts/i18n-extract.mjs                       # одиниці перекладу → _source/
# переклад за docs/I18N_TRANSLATION_BRIEF.md → src/content/i18n/_t/{ru,pl,en}/<slug>.json
node scripts/i18n-merge.mjs                         # докладає, нічого не видаляє (не i18n-apply!)
node scripts/i18n-coverage.mjs <lesson_id>          # ✓ — інакше лекція не готова
```

Лекція, написана російською (`glossLang: ru` у шапці), має ще й `uk`-карти. Підписи `Pułapki z ukraińskiego` / `Po ukraińsku` — теж одиниці перекладу (ru → `z rosyjskiego`, pl/en → `Typowe błędy`). Деталі — `docs/SITE_PUBLISHING.md` §8.

## Теги `grammar_point` — із закритого реєстру (16.11.2026)

Аудит показав 497 різних тегів у 476 файлах вправ замість реєстру на ~130 — через це mastery не рахувався на жодному рівні. Тепер:

- канон і правила — `docs/GRAMMAR_REGISTRY.md`, машинна копія — `docs/grammar-registry.json` (теги + синоніми), у Supabase — `course_grammar_points` і `course_grammar_aliases`;
- новий урок бере тег **лише** з канону; варіацій (`-formy`, `-popraw`, `-wyjatki`) не створюємо — деталізація йде в `block_id` і `explanation`;
- теми справді немає → спершу рядок у `docs/GRAMMAR_REGISTRY.md` + `docs/grammar-registry.json` + `insert` у `course_grammar_points`, і лише потім урок;
- перевірка: `npm run check:tags` або `python3 scripts/check_tags.py --changed` (входить у ворота вище), `--stats` показує теги, що є лише в одному уроці й тому не дають mastery.

## Номер уроку в курсі

`number:` у шапці сторінки = «№ у курсі» в Notion = порядок у карті курсу (`docs/CURRICULUM_*.md`). Міняєш порядок — міняй в усіх трьох місцях. Назва файлу й `lesson_id` при цьому **не** змінюються.

Ключ Notion API — у Supabase; із shell хмарної сесії `api.notion.com` і Supabase недоступні (проксі 403), тому Notion читати/писати через Notion MCP.
