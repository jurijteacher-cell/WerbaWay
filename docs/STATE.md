# Werba Way — STATE (поточний стан, 26.11.2026)

Лише те, що діє зараз. Зроблене — видаляти, не дописувати «✅ дата». Джерело правди по готових уроках: `content-queue/_manifest.json` і статуси в `docs/CURRICULUM_*.md`. Цей файл — єдине місце для черги, відкритих пунктів, учнів і голосів (раніше жив у claude.ai Project; там тепер лише вказівник).

## 1. Відкрите для Claude (закривати, Юру не просити)

1. **Аудіо екзаменів.** `pl-telc-probny-05/06` і `pl-b1-probny-06` озвучуються сайтом (ElevenLabs, сценарій у `src/content/audio/`) при першому запиті — після кожного деплою відкрити 4+4+5 mp3 по одному й перевірити `/api/audio/_status?lesson={id}` → `ready: true`. Слухання в лекціях видалено повністю (25.11); у частині TEACHER-сторінок лишились блоки запитань «після слухання» — зачистити при нагоді (`grep -il 'слухан' src/content/teacher-pages/*.md`). Старі спроби учнів по видалених блоках `e2/e3` в `*-exam.json` не мігруємо.
2. **Старі лекції → порції граматики** (GRAMMAR_METHOD) — лише за замовленням Юри. Починати з найбільшої граматики (відмінки: A2 60, 63, 64, 67, 72; telc dopełniacz).
3. **Відео в ДЗ** відсутнє в старших курсах (A0 / A1-en, граматика RU, księg 01–04, trener, preg, kpk). Список: `for f in src/content/pages/*.md; do grep -q youtube "$f" || echo $f; done`. Метод: Claude in Chrome → вкладка youtube.com (спершу `navigate` на youtube.com, інакше `fetch` блокує CORS) → `fetch('/results?hl=en&gl=US&search_query=…')`, з `ytInitialData` брати `videoId`, далі `fetch('/watch?v=ID')` → `ytInitialPlayerResponse` (перегляди, дата, довжина) і `/oembed` = 200. WebFetch YouTube блокує. Chrome-виклики проходять лише коли Юра писав у чат після останнього `PROVENANCE_REQUIRED`.
4. **`pl-trener-02-cialo-i-ruch`** — JSON у `main` не було (12.11). Перевірити `check_embeds.py pl-trener-02-cialo-i-ruch --remote`; немає → відновити й запушити.
5. **Сторінки сайту A2 55–59** — у `main` не було; 6 сторінок (B1 08, 02, 07, 03 Rodzina, 03 Slang, `pl-gram-zaimki-uk`) застарілі відносно Notion. Останній раз Notion знадобиться тут: `notion-fetch` → конвертація за шаблоном `pl-a2-53` → push.
6. **`pl-ksieg-05`:** (а) вікно `/embed/pl-ksieg-05-pit-cit-formy-opodatkowania/hw` з shell / WebFetch 21.11 не відкрилося — перевірити сайт; (б) у січні 2027 перевірити зміни PIT / ryczałt / CIT від 2027 і `Stan prawny` у `Źródła`; (в) відео ДЗ (`bSYRu-37KzQ`) повністю не переглянуто; (г) слухання немає.
7. **`ru-a0` 01–03** — у старому форматі (без інтерактивних вправ, TEACHER, запису в манифесті, `number` / `level`, заголовки `##` англійською, i18n-карти — копії англійського). Переробити за v4.0 лише за замовленням Юри. `ru-a0-04/05` теж без `number`; коли 01–03 переробляться — додати `number` усім п'яти.
8. **Курс `ru-a0` не має карти:** наступний урок за сюжетом (родина Анни з Риги: Анна, Edik, па́па, ма́ма, друг Давит з Тбілісі). Було: 01 алфавіт · 02 «Это …», он / она / оно, мой, числа 0–10 · 03 дієслова я / ты / он, числа 11–20 · 04 мы / вы / они, жить, родина, «У меня есть», числа 20–100 · 05 «Где?»: в / на + -е, винятки. Кандидати: «Куда?» (в / на + знахідний), час і розклад дня, множина іменників, їжа й замовлення, минулий час — пізніше.
9. **Теги `grammar_point` для російської** відсутні в реєстрі; `ru-a0-04/05` використовують найближчі польські. Якщо Юра хоче mastery по російській — додати `ru-*` теги в `GRAMMAR_REGISTRY.md` + json + Supabase.
10. **`pl-nier-02`:** (а) слухання немає; (б) відео ДЗ `Xd7rHqDr-0c` повністю не переглянуто; (в) цифри сюжету тримати далі: оферта B 842 000 zł (Łazarz, 62 m²), Wilda 715 000 zł, Grunwald 690 000 zł / 66 m², дім у Komornikach 1 190 000 zł. Діагностику з уроку 01 ще не проведено.
11. **`pl-nier-04`:** відео ДЗ (`647Zl9ohy7w`, Małycha Agency) — вбудову не перевірено; обкладинка й фото в тексті повторюють 02 — замінити.
12. **`pl-nier-06`:** відео в ДЗ **немає** — у сесії 27.11 сторінки YouTube (watch і пошук) не відкривалися, тому посилання не вигадувалося; додати в наступній сесії або взяти лінк від Юри.
12. **`pl-nier-07`:** відео ДЗ — Wynajmistrz, «CENY mieszkań…» (`7juOypDkK4A`): існування й назву підтверджено через oEmbed, **перегляди, дату й тривалість не перевірено** (сторінка YouTube не відкрилася). Перед уроком відкрити й за потреби замінити. Цифри модуля зведені в TEACHER 07.
12. **`pl-nier` el1/el2:** уроки 06–07 мають блоки «Elementy języka» за LESSON_PROTOCOL §4; уроки 03–05 їх не мають — додати, якщо Юра захоче однаковості.
12. **Довідники:** 27.11 додано `docs/ref/genitive.md` і `docs/ref/numerals-prices.md` — нові лекції беруть форми звідти, не перешукують.
12. **`pl-nier-05`:** відео ДЗ (`GjQL7xSvF6E`, Muniak Development, 4:28) — повністю не переглянуто, вбудову не перевірено; рядок плану 05 («szukam mieszkania») виправлено: це родовий, не biernik.
12. **`pl-remont` 01–02:** (а) відео ДЗ немає — YouTube-пошук через Chrome 25.11 не дав польських роликів за темою (розрахунок матеріалів для ремонту) з ≥10k переглядів; пошукати інакше (канали майстрів, «jak policzyć materiały»); (б) аудіо 02 згенерувати відкриттям mp3 на сайті, якщо не вийшло в тому ж ході.
13. **Перевірки:** переконатися, що `check_lecture.py` покриває: слухання без `audio-ready.json` → ✗; пастки з ✗ = ✓ → ✗; сходинки без теорії між embed-ами → WARN; дублікати речень у теорії / vocab / вправах / hw → WARN; cloze: кількість `{id}` = кількість `items`, однакові `options[]` у різних пунктах блоку. Чого немає — дописати в скрипт.
14. **Elementy języka (25.11):** `el1`/`el2` у `-grammar.json` + підрозділ на сторінці — у всіх лекціях A2/B1 крім «kontrolna» 62, 69, 76 (там тексту нема). Правило — `LESSON_PROTOCOL.md` (Czytanie). Дописати в `check_lecture.py`: лекція A2/B1 без `el1`+`el2` → ERR (для нових лекцій). Тексти писали паралельні субагенти: за нагоди переглянути однозначність відповідей у діалогах (`el1`).
15. **Категорії `/learn` (25.11):** порядок — `COURSE_RANK` у `src/lib/pages/pages.ts`; правила іспитних модулів і нумерації — `SITE_PUBLISHING.md`. Не перевірено під акаунтом учня: порядок на `/learn`, нові частини іспиту-лекції (`mock-exam?part=`), живий звук учня в «Дивитися».

## 2. Черга нових лекцій (перевірити за `_manifest.json` і картою перед стартом)

- **A2 `pl-a2`:** зроблено 80 і 81. Далі — найменший невиконаний номер серед 73–88 (73 `isc-jechac-przedrostki` → 74 `ktory-podstawy` → 75–76 powtórka / kontrolna M4 → 77–83 M5 → 84–88).
- **B1 `pl-b1-group`:** лекції 1–22, 23 (Internet) і 24 (Wygląd i charakter) + R1–R4 готові → **пробний іспит B1 курсу** (`mock-exam`, матеріал 1–22; слухання — лише з ElevenLabs).
- **telc B1 `pl-telc-b1`:** далі урок 5 «U lekarza» (`pl-telc-b1-05-zdrowie`, dopełniacz) → 6 powtórka-1 + mini-test. Глоси — російською.
- **B2:** №3 Media i dezinformacja → №4 → №6 → №10 → №11.
- **`pl-ksieg`:** 01–05 готові. Далі **06** — типи договорів, składki ZUS, lista płac (пасивний стан). Сюжет: Halina у бюро; клієнти pani Iwona (kwiaciarnia), pan Tomasz (sklep rowerowy), pan Adam (sp. z o.o., 9% CIT).
- **`pl-nier`** (ріелторка, 15 уроків після зміни плану 24.11): 01–07 готові (06 Dopełniacz і 07 Liczebniki i ceny — 27.11). Далі **08** (Miejscownik i przyimki) — §3a карти `CURRICULUM_PL-NIER.md`; поверхи (`na trzecim piętrze`, `na parterze`) і години (`o` + місцевий) уже стоять у 07, у 08 їх закріплюємо. Колишні B2-уроки стали 13–15.
- **`pl-gram-ru`:** наступна тема з кандидатів: aspekt w praktyce · stopniowanie + im…tym · czasowniki ruchu з przedrostkami · mowa zależna (imiesłowy przysłówkowe і gdyby Юра відхилив).
- **`pl-remont`** (майстер-ремонтник, A2, 8 уроків, `CURRICULUM_PL-REMONT.md`): 01–02 готові. Далі **03** — «Kiedy skończymy? Terminy i harmonogram prac» (майбутній час, прийменники часу). Персонажі: Joanna, Artur, Marek, Ewa, sprzedawczyni Ilona.
- **`ru-a0`:** 01–05 готові. Далі 06 — див. §1 п. 8.

## 3. Сюжет A2

- M4: 72 — wyjazd integracyjny до Закопаного 14–16 березня, Pensjonat „Pod Jodłami” (рецепція pani Anna Mróz), 9 осіб, завдаток 500 zł; пес пана Piotra лишається вдома. 73 — їдуть потягом.
- M3: мама (pani Halina) гостювала в Кракові, повернулась до Львова; Tomek — день народження в п'ятницю (зелений шарф); doktor Nowicka.
- Персонажі: Olena, Taras, Tomek, pan Piotr, pani Agnieszka, Kasia (Гданськ), син Andrij у Києві, онук Marek.

## 4. Учні й модулі

- `pl-telc-b1` — учень A1+/A2 → telc B1, спілкується російською (глоси ru); пробні telc — окремий модуль `pl-telc-probny` (видавати разом), розбір помилок — `pl-bledy`.
- `pl-gram-ru` — учень-білорус, ru, `grammar-60`; хоче живих розмовних тем.
- `pl-gram-b2` — говорить добре: повторення B1 → B2, граматика першою.
- `pl-ksieg` — українська бухгалтерка (склала B1), 12 × 60 хв.
- `pl-nier` — ріелторка, ≈B1 з слабкою граматикою; після 02 — граматичний мінімум 03–12 (готові 03–07), потім B2 13–15; лише сайт; діагностика уроку 01 не проведена.
- `pl-kp` — Karta Polaka, ~A1+; дати й історія пройдені.
- `pl-kpk1` — за підручником «Polski, krok po kroku 1»; повторення лише з пройденого.
- `pl-a1-en` — носійка англійської, викладачка англійської: EN-формат, 90 хв, кожен урок починається з легкого читання.
- `pl-prawko` — польські права, B1, `light-60`.
- `pl-preg` — вагітність і пологи для конкретної учениці; порядок тем визначає Claude.
- `pl-arch` — студент будівництва й архітектури: геометрія / математика польською.
- `ru-a0` — російська з нуля для англомовного (знає польську); EN-формат, 60 хв, `glossLang: en`; без росієцентричного контенту.

## 5. Аудіо

- Маршрут — `AUDIO_SITE.md`. Озвучуємо завжди; кошторис — інформація в чаті, «так» не чекаємо.
- Голоси (`eleven_v3` / `v4`): Olena W1 `mQq2zdGT1zEfDbh8W95l` · pani Agnieszka W2 `gHGjEjdr2LBds0XHTsvg` · Taras M1 `p0KQaxqGrT7xcRWSJiHp` · pan Piotr M2 `bwhymd1UcFEihyvPSEoR` · Tomek M3 `ihTsqWCgsTDbANOCuZD2` · NAR `uPeXyAUvljDRLYs8zgwt` · мама (pani Halina) `cnYygtdARUZ1LhB2crKx` · Kasia `F4S1QHSHuBfGEaPzx8aN`.
- Залишок кредитів на 20.11 ≈ 50 700 (перевіряти `account_get_usage`). Транскрипцію (`creative_transcribe_audio`) не запускати без потреби — коштує в ~17 разів більше за оцінку.
- Для TTS числа й абревіатури — словами / фонетично (IT → «aj-ti»), у транскрипті на TEACHER — як у сценарії.

## 6. Технічні пастки репо

- Репо в сесії: `add_repo(jurijteacher-cell/WerbaWay, access=push)` → один `git clone --depth 1 … /home/claude/werbaway` (таймаут ≈ 10 хв). Push: `git -c push.negotiate=true push origin HEAD:main` (403 → `add_repo`; 503 → почекати й повторити). `gh pr create` не працює (GraphQL заблоковано) → `gh api repos/<owner>/<repo>/pulls -f title=… -f head=… -f base=main`.
- Мережа shell — за білим списком: `npm ci` може падати → збірку не запускати, структуру JSON звіряти Python-скриптом; `werba-way.vercel.app` з shell недоступний, WebFetch може не відкрити embed — для видимих вікон Chrome. `PROVENANCE_REQUIRED` — не ретраїти, чекати повідомлення Юри. Після push перший запит може дати 404 — деплой Vercel ≈ 1–2 хв.
- **Фото через Chrome:** `navigate` на `unsplash.com/s/photos/<2-4 слова>` → `javascript_tool`: `figure img[src*="photo-"]` → `url` (без query), `alt`, `a[href^="/photos/"]`; автор — `fetch(href)` → `og:title`. Ландшафтна обкладинка: `…?w=1600&h=900&fit=crop&q=80&fm=jpg`. Без Chrome — фото з уже використаних у репо (`grep -rhoE '!\[[^]]*\]\(https://images.unsplash.com/[^)]*\)' src/content/pages`).
- `_manifest.json`: частина записів має `id` замість `lesson_id` → `x.get('lesson_id') or x.get('id')`.
- Embed для `exam` і `grammar` — завжди з `?blocks=`; діапазон `g4-g6` — один embed, окремі `t1`, `t2` — окремі.
- `i18n-merge.mjs`, не `i18n-apply.mjs`. `i18n-merge` без аргументів створює `uk`-карти для всіх лекцій — після нього `git status` і відкат непотрібного, або запускати лише `ru pl en`.
- **Кирилиця як мова, що вивчається (`ru-a0`):** `glossLang: en` пропускає сторінку, але `check:i18n` рахує кожне російське речення в JSON вправ одиницею перекладу. Лишати тотожні карти `ru / pl / en` (значення = той самий текст).
- Вписування з наголосом: `stripDiacritics` прибирає U+0301 і `ё → е`, тому в `answer` — без наголосу, `accept[]` — з наголосом і з `е`. Для `sentence-building` слова з наголосом, `answer` з наголосом, `accept[]` без. У `cloze-text` з `options` — `answer` = один з `options` рядок у рядок.
- Пишучи JSON з маркером наголосу (`^`) в одному скрипті — обгортати `S()` усі поля, що йдуть учневі (`explanation`, `back_scenario`, `text`), і перевіряти `grep -c '\^'`.
- `options[]` різних пунктів одного блоку не повторювати (баг рендера).
- `sentence-building`: `check_answers.py` дає WARN, якщо природний порядок слів чи синонім не в `accept[]` — додавати варіанти, але не такі, що прибирають цільову конструкцію.
- `rm` зі змінною в шляху блокує захист — повний шлях або `"${S:?}"/…`.
- Заголовки `##` писати польською (з них рахуються ключі кроків `?step=`); у `ru-a0` — англійською.
- Теги `grammar_point` — лише з `docs/grammar-registry.json`.
