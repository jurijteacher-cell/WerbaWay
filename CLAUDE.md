# Werba Way — правила для Claude в цьому репо

Повні правила — `docs/00_START_HERE.md`, `docs/LESSON_PROTOCOL.md` (v4.0), `docs/CONTENT_SPEC.md`, `docs/SITE_PUBLISHING.md`. Спілкування з Юрою — українською, коротко, висновок спочатку. Юрі нічого не доручати: усе робить Claude сам.

## Постійні дозволи Юри (21.11.2026) — не перепитувати

Юра раз і назавжди дозволив усе, що потрібно для циклу лекції: `add_repo(jurijteacher-cell/WerbaWay, access=push)`, `git clone`, правки, commit, `git push origin HEAD:main`, пошук і WebFetch, Chrome для перевірок, запис у Project, оновлення `docs/*`, `CLAUDE.md`, `STATE.md`, карт курсів і `_manifest.json`.

Сесія починається з доступу: `add_repo` → один `git clone --depth 1` у `/home/claude/werbaway` (таймаут ≈ 10 хв) → `register_repo_root`. Якщо система відхилила дію з цього списку: повторити **один раз**, послатися на цей пункт; відмову не обходити іншим маршрутом; якщо повтор теж відхилено — зробити все, що не потребує репо, і одним рядком назвати блокер. Не питати те, що вже дозволено.

За підтвердженням лишається лише: кредити ElevenLabs (кошторис → «так»), видалення / перейменування опублікованих уроків, усе, що надсилається учням.

## Від А до Я без зупинок

Юра не сидить поруч, жодного підтвердження за 10–20 хв лекції не буде. **Одне замовлення = весь цикл до кінця в одному ході:** JSON → переклади → сторінки сайту (учень + TEACHER) → перевірки → один push у `main` → `--remote` перевірка → (аудіо, якщо Юра сказав «так») → manifest → карта курсу → `STATE.md`. Нічого не відкладається «на наступну сесію». Технічно неможливий крок — зробити решту й одним рядком назвати факт.

**Notion не використовується (Юра, 21.11.2026):** сторінок у Notion не створювати, не оновлювати, не fetch-ити; кроки «Notion» у старих `docs/*` скасовані (`LESSON_PROTOCOL.md` v4.0 має пріоритет).

## Вправи — спершу в `main`

Порожні вікна вправ (A2 54–59, B1 17–19) виникали, коли сторінку публікували раніше за JSON. Тепер:

1. **Крок 0 кожної сесії:** `cat src/content/pages/*.md > /tmp/p.md && python3 scripts/check_embeds.py --page /tmp/p.md --remote` → усе ✓. Чогось немає — перезалити самому.
2. **Ворота (локально, до push):** `python3 scripts/check_answers.py {lesson_id}` (0 ERR) → `python3 scripts/check_tags.py --changed` (0 невідомих тегів) → `npm run check:lesson {lesson_id}` → `npm run check:i18n -- {lesson_id}`.
3. **Один коміт, один push:** `git -c push.negotiate=true push origin HEAD:main` (403 → `add_repo`, 503 → повтор). Без гілок і PR.
4. Після деплою: `python3 scripts/check_embeds.py {lesson_id} --remote` = ✓ і WebFetch `https://werba-way.vercel.app/embed/{lesson_id}/hw` показує завдання.
5. Стану «закомічено локально, запушить інша сесія» не існує.

## Тексти = вправи; аудіо через сайт

- Кожен новий текст (читання, діалог) має інтерактив: `ordering` або відгадування + `cloze-text` ≥ 6 пропусків. Правила — `docs/LESSON_PROTOCOL.md` §5.1, схеми — `docs/CONTENT_SPEC.md`.
- Слухання — лише з готовим аудіо (§5.2): сценарій `src/content/audio/<lesson_id>.json`, сайт генерує через ElevenLabs, після деплою відкрити `/audio/*.mp3` і перевірити `/api/audio/_status`. Деталі — `docs/AUDIO_SITE.md`. Перед генерацією — кошторис і «так» Юри; немає «так» — лекція без слухання.

## Усі мови сайту — в тому ж пуші

Сайт працює укр · рос · пол · англ. **Нова лекція (або правка пояснення в старій) пушиться разом з усіма перекладами**: `src/content/i18n/pages/<slug>.{ru,pl,en}.json` і `src/content/i18n/exercises/<lesson_id>-*.{ru,pl,en}.json`.

```bash
node scripts/i18n-extract.mjs                       # одиниці перекладу → _source/
# переклад за docs/I18N_TRANSLATION_BRIEF.md → src/content/i18n/_t/{ru,pl,en}/<slug>.json
node scripts/i18n-merge.mjs                         # докладає, нічого не видаляє (не i18n-apply!)
node scripts/i18n-coverage.mjs <lesson_id>          # ✓ — інакше лекція не готова
```

Лекція, написана російською (`glossLang: ru`), має ще й `uk`-карти. Підписи `Pułapki z ukraińskiego` / `Po ukraińsku` — теж одиниці перекладу (ru → `z rosyjskiego`, pl/en → `Typowe błędy`). Пастки для інших локалей перевіряються окремо (LESSON_PROTOCOL §4.3). Деталі — `docs/SITE_PUBLISHING.md` §8.

## Теги `grammar_point` — із закритого реєстру

- канон і правила — `docs/GRAMMAR_REGISTRY.md`, машинна копія — `docs/grammar-registry.json` (теги + синоніми), у Supabase — `course_grammar_points` і `course_grammar_aliases`;
- новий урок бере тег **лише** з канону; варіацій (`-formy`, `-popraw`, `-wyjatki`) не створюємо — деталізація йде в `block_id` і `explanation`;
- теми справді немає → спершу рядок у `docs/GRAMMAR_REGISTRY.md` + `docs/grammar-registry.json` + `insert` у `course_grammar_points`, і лише потім урок;
- перевірка: `npm run check:tags` або `python3 scripts/check_tags.py --changed`.

## Номер уроку в курсі

`number:` у шапці сторінки = порядок у карті курсу (`docs/CURRICULUM_*.md`). Міняєш порядок — міняй і в сторінці, і в карті. Назва файлу й `lesson_id` при цьому **не** змінюються.

## Технічні пастки

- Мережа shell — за білим списком: `npm ci` може падати → збірку не запускати, структуру JSON звіряти Python-скриптом; `werba-way.vercel.app` з shell недоступний — вікна перевіряти WebFetch.
- `_manifest.json`: частина записів має `id` замість `lesson_id` → `x.get('lesson_id') or x.get('id')`.
- Embed для `exam` і `grammar` — завжди з `?blocks=`.
- Заголовки `##` у сторінках писати польською (з них рахуються ключі кроків `?step=`).
- `options[]` різних пунктів одного блоку не повторювати.
- `rm` зі змінною в шляху блокує захист — писати повний шлях або `"${S:?}"/…`.
