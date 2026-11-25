# pl-nier — розмовна польська для ріелторки, B1 → B2 (карта модуля)

**Учениця:** ріелторка (pośredniczka w obrocie nieruchomościami), за її словами — польська B1. Мета: **розмовна впевненість саме в роботі** (клієнт, власник, огляд, торг, формальності) і перехід від B1 до B2 у цій сфері.
**Формат:** індивідуально, **5 × 90 хв**, шаблон модуля `rozmowa-90` (нижче). Мова глос — українська (`Pułapki z ukraińskiego`). TEACHER — українською.
**Де живе модуль:** **лише сайт** (`module: pl-nier`, «Польська для ріелторки»). У Notion модуль і уроки **не створювалися** (рішення уроку 01: ученицю веде сайт; TEACHER — `src/content/teacher-pages/`). Якщо Юра захоче Notion — окрема задача за NOTION_STRUCTURE §5.
**LMS:** `lesson_id` = `pl-nier-{NN}-{slug}`; JSON у `src/content/queue-published/`. Порядок — LESSON_PROTOCOL v3.18+: JSON → `check_answers.py` 0 ERR → `check_tags.py` → push у `main` → `check_embeds.py --remote` ✓. Сайт + переклади ru/pl/en (`i18n-extract` → переклад → `i18n-merge` → `i18n-coverage` ✓) — у тому ж пуші (00_START_HERE §0). Запис у `content-queue/_manifest.json` (module `pl-nier`, `course_order` = № уроку).
**Репо:** карта дзеркалиться в `docs/CURRICULUM_PL-NIER.md` (зроблено в уроці 01). Міняєш карту — міняй обидві копії.

> **Зміна планів (24.11.2026, Юра).** Учениця розмовляє на рівні близько B1, але граматична база слабка. Тому між уроками 02 і B2-блоком додано **граматичний мінімум з 10 уроків (03–12)**: усе, що треба для вільної повсякденної розмови в роботі, до автоматизму; розмовна частина лишається ≥ 50% часу. Колишні B2-уроки 03–05 стали **13–15** (їхні `lesson_id` перейменовані в тексті карти, поки уроки не написано). Модуль тепер із 15 уроків. Теми 03–12 нижче, §3a.

> **Чесна межа.** 5 × 90 хв не дають повного B2. Реальний результат модуля: **B2 у професійному мовленні** (клієнт / власник / огляд / торг / формальності) — довші зв'язні висловлювання, реакція на непередбачене, свідомий вибір регістру, 4 граматичні теми B2 «в роботі». Це й є критерій успіху (урок 15 порівнює з діагностикою уроку 01).

---

## 1. Шаблон уроку `rozmowa-90` (однаковий для всіх 5 уроків)

Розмова ≥ 50 % часу. Граматика — тільки та, що потрібна для мовленнєвої дії уроку (не «граматика заради граматики»).

| № | Розділ | Що всередині | Хв |
|---|---|---|---|
| — | **Cele lekcji** | 3–4 цілі «Po tej lekcji potrafisz…», кожна — дія в роботі ріелтора | — |
| 1 | **Rozgrzewka** | 1 питання з досвіду учениці + słowo dnia (повертаємось у Podsumowaniu). В уроці 01 — ще діагностичний монолог (§4) | 5 |
| 2 | **Czytanie** | оригінальний текст реального жанру (§3), фото; 4 відкриті питання + `e1` (prawda/fałsz, 5–6 пунктів) | 15 |
| 3 | **Słownictwo** | вступна плашка з групами + embed `vocab` + `g1` на колокації | 10 |
| 4 | **Gramatyka** | одна частина: теорія → wyjątki → pułapki → embed `g2–g5/g6` | 20 |
| 5 | **Mówię płynnie** | зелена плашка: 6–8 дискурсивних маркерів + 1 стратегія розмови (§3, свої для кожного уроку) | 5 |
| 6 | **Zadania komunikacyjne** | 3 `flip-task`; перша — з діалогом-зразком 12–14 реплік (на TEACHER) + `e2` (3–4 питання); у кожній — **zwrot akcji** (прихована несподіванка, лише на TEACHER); + монолог 2 хв | 30 |
| 7 | **Podsumowanie** | чекбокс на кожну ціль + słowo dnia | 5 |
| 8 | **Praca domowa** | embed `hw` (≥ 4 блоки, нові контексти) · `🎬 Wideo` (v3.19) · `🎙️ Nagranie` (голосове 1,5–2 хв) · `✍️ Pisanie` | — |
| — | **Słowniczek** · **Źródła** | Słowniczek — завжди; Źródła — якщо в уроці є факти (у 14–15 обов'язково) | — |

**Параметри**

| | Уроки 01–02 (B1+) | Уроки 13–15 (B2) |
|---|---|---|
| Текст Czytanie | 300–350 слів | 380–450 слів |
| Цільова граматика в тексті | ≥ 8 | ≥ 10 |
| Словник | 25–30 слів, 4 групи (1 — колокації, по 1 — на кожну задачу) | те саме |
| Блоки теорії | 6–8 | 7–8 |
| Wyjątki · pułapki | 1 блок · 5–6 пасток | 1 блок · 5–6 пасток |
| Граматичні вправи | g1 + 4–5 (g2–g6) | g1 + 5 (g2–g6) |
| Комунікаційні задачі | 3 | 3 |
| e1 + e2 | так | так |
| Письмо в ДЗ | 130–160 слів | 160–200 слів |
| Фото | 1 + 1 | 1 + 2 |

**Файли кожного уроку:** `-vocab.json` · `-grammar.json` · `-comm-tasks.json` · `-exam.json` (e1, e2) · `-hw.json` + сторінка учня і `TEACHER · …` + сторінки сайту + i18n.

**TEACHER кожного уроку додатково до LESSON_PROTOCOL:**
- **картки ролей для викладача**: хто клієнт, чого хоче, що приховує, межі (напр. максимальна ціна), коли вмикати zwrot akcji;
- **рубрика мовлення B2** (по 0–3): płynność · zakres słownictwa · poprawność · rejestr (Pan/Pani, ввічливість) · reakcja na niespodziankę;
- що записати в «журнал помилок» учениці (переноситься в наступний урок і в повторення).

---

## 2. Сюжет і персонажі (вигадані, єдині для модуля)

Місто — **Poznań** (Jeżyce, Łazarz). Агенція — **Biuro Nieruchomości „Klucz”** (вигадане). Адреси — вигадані (`ul. Kasztanowa 14/7`).

| Персонаж | Хто | Роль у сюжеті |
|---|---|---|
| **Natalia** | pośredniczka з Charkowa, 2 роки в Познані, колега-зразок у текстах | голос текстів Czytanie; у рольових іграх учениця грає **себе** |
| **pani Joanna Kaczmarek** | szefowa biura | вимоги до звіту, ціни, внутрішні правила |
| **państwo Marta i Paweł Lisowie** | Marta — nauczycielka, Paweł — logistyk, діти 6 і 9 років; зараз винаймають | купують 3 pokoje: budżet do ok. 720 tys. zł з кредитом; Marta — близько до школи, Paweł хоче miejsce parkingowe (каже про це лише в уроці 03) |
| **pani Barbara Zielińska** | właścicielka mieszkania na Jeżycach, emerytka, емоційно прив'язана | продає 64 m², 3 pokoje, 3. piętro в kamienicy без windy, częściowo po remoncie, balkon на podwórze, piwnica |
| **pan Ravi Sharma** | програміст з Bangalore, переїжджає за місяць, польська A2 | винаймає 2 pokoje на Łazarzu до ~3 500 zł — лінія najmu (учениця вчиться **говорити простіше** для іноземця) |
| **pan Tadeusz Wrona** | właściciel mieszkania на wynajem для Raviego | хоче najem okazjonalny, питає про kaucję |

**Додатково з уроку 01 (використані в текстах, тримати однаково):** pan Dawid (клієнт у нотатці Natalii), pani Anna (діалог e2 «Natalia ↔ pani Anna»; pani Kowalczyk — клієнтка в e2), pani Monika Brzezińska (клієнтка з e-mail у ДЗ 01: кавалерка для доньки-студентки, бюджет до 380 000 zł), pan Marek (голосова пошта в ДЗ 01).

**Ціни:** cena ofertowa Zielińskiej — **749 000 zł** (≈ 11 700 zł/m²), торг закінчується ≈ **720 000 zł**. Перед уроком 02 звірити з поточними оголошеннями (Jeżyce, kamienica, 3 pokoje). Якщо ринок інший — змінити цифри, **зберігши пропорції** (Lisowie пропонують ≈ −6 %, фінал ≈ −4 %). Цифри мають бути однакові в усіх уроках.

**Лінія сюжету:** 01 перший дзвінок Lisów + дзвінок до Zielińskiej → 02 опис квартири й оголошення → 03–12 граматичний блок на тих самих персонажах (графік, клієнти, опис, ціни, люди) → 13 огляд із Lisami, заперечення → 14 торг між Lisami й Zielińską, zadatek, umowa przedwstępna → 15 формальності до ключів + najem для Raviego.

---

## 3. Карта уроків

### 01 · Dzwonię w sprawie ogłoszenia — перший контакт і аналіз потреб
`pl-nier-01-pierwszy-kontakt` · рівень B1+ · **✅ опубліковано (21.11.2026)**

- **Мовленнєва дія:** прийняти дзвінок клієнта, поставити відкриті питання, перефразувати потреби, домовитися про огляд; подзвонити власниці й запропонувати співпрацю.
- **Граматика (фактичні теги в JSON):** `pan-pani` · `warunkowy-prosby` · `przypuszczajacy-formy` · `grzecznosc-chcialbym` (2 пункти) · `pytania-zalezne` · `mowa-zalezna` (= парафраза, зміна особи) + службові `kalki-uk`, `slownictwo`.
  Структура вправ: `g1` колокації · `g2–g3` Pan/Pani/Państwo + ввічливий tryb przypuszczający · `g4–g5` pytania zależne + парафраза · `g6` зміна особи («з „ja” на „Pan / Pani / Państwo”»).
  Блоки теорії на сторінці: ① Pan/Pani/Państwo: яка форма дієслова ② прохання ввічливо: tryb przypuszczający (*mógłby Pan, chciałabym, byłoby*) ③ як збудувати форму (-łbym/-łabym/-łby/-łaby/-libyśmy) ④ pytanie zależne: вбудуй питання в речення ⑤ як почати pytanie zależne (*czy, jaki, ile, kiedy*) ⑥ parafraza: *Czyli…, Jeśli dobrze rozumiem…* ⑦ зміна особи.
  Wyjątki: *Mogę…? / Czy mogłabym…?* — обидва правильні, різниця — регістр. **Не позначати як помилку** *Ja bym chciała* — це нормальна розмовна форма.
- **Pułapki z ukraińskiego:** *дзвоню по оголошенню* → dzwonię **w sprawie** ogłoszenia · *шукаю квартиру* → szukam **mieszkania** (dopełniacz) · *Ви* до однієї особи → **Pan / Pani** · *передзвоню (у відповідь)* → **oddzwonię** · *квартира на три кімнати* → **mieszkanie trzypokojowe** · *зустрінемося біля будинку* → spotkajmy się **przed** budynkiem.
- **Słownictwo (28 слів, 4 групи):** „Pierwszy kontakt” · „Potrzeby klienta” · „Rynek i biuro” · „Współpraca z właścicielem”.
- **Czytanie:** «Notatka Natalii po pierwszym tygodniu w biurze» (pan Dawid) + `e1` prawda/fałsz (6 пунктів: F·T·F·T·F·T).
- **Mówię płynnie:** *Jeśli dobrze rozumiem… · Czyli chodzi Państwu o… · Co jest dla Państwa najważniejsze? · Zanotuję sobie… · Przepraszam, nie dosłyszałam…* Стратегія: **питай → перефразуй → підсумуй**.
- **Zadania komunikacyjne (comm_groups: first, second, fourth):** 1) дзвінок клієнта після оголошення (діалог-зразок + `e2`; zwrot — бюджет нижчий за ціну) · 2) зустріч в офісі: аналіз потреб (zwrot — різні пріоритети подружжя) · 3) дзвінок до pani Zielińskiej (zwrot — «sprzedam sama»). Монолог 2 хв «Kim jestem i jak pracuję» — **діагностика** (§4).
- **Аудіо:** діалог `e2` озвучено в ElevenLabs 21.11.2026 (flow `yAnmT4EjliohPg94UkbD`, 91 с, ≈1 364 кредити; голоси W5 Natalia + W2 Wanda), але **mp3 у репо ще немає** (домен ElevenLabs закритий проксі сесії) — до того e2 на сайті в режимі «читає викладач» двічі. Коли файл ляже в `public/audio/pl-nier-01-pierwszy-kontakt-e2-dialog.mp3`, додати `audio_url` у блок e2 в `-exam.json`.
- **ДЗ (фактично):** `hw` (4 блоки, нові ситуації) · 🎬 «Luźno Wyjaśnione: Zakup Mieszkania» (канал Luźno Wyjaśnione, ≈10 хв; 96 тис. переглядів, 15.09.2026) з трьома письмовими завданнями на парафразу й pytania zależne · 🎙️ голосове до клієнта pana Marka (1 хв) · ✍️ **e-mail до pani Brzezińskiej** після дзвінка (130–160 слів; замість запланованого e-mail Lisom — Lisowie залишаються для уроків 02–05).
- **TEACHER:** діагностика учениці (§5), картки ролей, рубрика B2, журнал помилок.

### 02 · Mieszkanie z duszą — опис нерухомості й оголошення
`pl-nier-02-opis-i-ogloszenie` · рівень B1+ → B2 · **✅ опубліковано (23.11.2026)**

- **Мовленнєва дія:** зібрати інформацію від власниці, описати квартиру усно й письмово, порівняти дві пропозиції, вимовляти ціни, метраж і поверхи без паузи.
- **Граматика:** `new` `imieslow-bierny` · `imieslow-czynny` · `stopniowanie` · `porownania` · `liczebniki-skladnia`; `rec` `przypuszczajacy-formy`, `pytania-zalezne`.
  Блоки: ① imiesłów bierny -ny/-ony/-ty: *wyremontowany, położony, umeblowany, wyposażony* ② imiesłów czynny -ący: *okna wychodzące na park, sąsiadujący z…* ③ imiesłów замість *który* (*mieszkanie, które zostało wyremontowane* → *wyremontowane mieszkanie*) ④ місце означення: перед / після іменника (*świeżo wyremontowana kuchnia* vs *kuchnia otwarta na salon*) ⑤ stopniowanie: *jaśniejszy, przestronniejszy, bardziej funkcjonalny, lepszy* ⑥ porównania: *niż / od, o wiele, im…, tym…, tak samo… jak* ⑦ **liczby na głos**: ціни (*749 tysięcy złotych*), метри (*64 metry kwadratowe*, *65 metrów*), *2 pokoje / 5 pokoi*, поверхи порядковими.
  Wyjątki: нерегулярні imiesłowy (*wzięty, zajęty*), *do remontu / do odświeżenia* — не imiesłów, а *do + D*.
- **Pułapki:** *на третьому поверсі* → лічба інша: **parter** = наш 1-й поверх, *trzecie piętro* = наш 4-й · *60 квадратів* → **60 metrów (kwadratowych)** · *квартира з ремонтом* → **po remoncie / wykończone** · *комуналка* → **opłaty, czynsz administracyjny** (*czynsz* ≠ лише оренда) · *вторинка / новобудова* → **rynek wtórny / pierwotny** · *вікна виходять у двір* → okna **wychodzą na** podwórze.
- **Słownictwo:** ① pomieszczenia: salon z aneksem kuchennym, sypialnia, przedpokój, garderoba, piwnica, komórka lokatorska ② budynek: kamienica, blok, wielka płyta, winda, klatka schodowa, parter, ogrzewanie miejskie ③ stan i standard: do remontu, do odświeżenia, po remoncie, pod klucz, stan deweloperski, umeblowane ④ atuty: rozkładowe, ustawne, słoneczne, ciche, ekspozycja południowa, w zasięgu spaceru.
- **Czytanie:** два оголошення (kamienica Zielińskiej і новобудова від dewelopera на Łazarzu) + коментар Natalii, що «продає» в оголошенні. e1 — prawda/fałsz на порівняння.
- **Mówię płynnie:** *Przede wszystkim… · Co ważne,… · Warto podkreślić, że… · Do tego… · Największym atutem jest… · Jeśli chodzi o…* Стратегія: **від головного атуту до деталей**.
- **Zadania komunikacyjne:**
  1. Інтерв'ю з pani Zielińską для оголошення (діалог-зразок + e2). *Zwrot:* власниця замовчує вади (вологість у piwnicy) → дипломатично допитати.
  2. Презентація оферти телефоном за 90 с. *Zwrot:* клієнт каже, що бачив дешевшу квартиру поруч.
  3. Порівняння двох оферт для Lisów (дані — на картці). *Zwrot:* клієнт питає «a Pani co by wybrała?» — порадити, не тиснучи.
  - **Монолог 2 хв:** опис квартири без нотаток.
- **Факти перевірити:** що **обов'язково** має містити оголошення / що треба мати при продажу й оренді (świadectwo charakterystyki energetycznej — з 2023; чи потрібен показник в оголошенні) — лише після пошуку, з Źródła.
- **ДЗ:** hw · 🎬 відео-тур квартирою / home staging польською · 🎙️ презентація **іншої** нерухомості (будинок під Познанню) 2 хв · ✍️ оголошення про цей будинок: заголовок + опис (130–160).
- **Фактично (23.11.2026):** слухання e2 немає (аудіо не замовлялося; діалог-зразок c1 — текст на TEACHER); 29 слів у 4 групах (Pomieszczenia · Budynek i opłaty · Stan i standard · Atuty); граматика — 6 сходинок (bierny + wyjątki, czynny, krócej zamiast «który», stopniowanie + wyjątki, porównania, liczby + wyjątki) + пастки (5) + збірна g12. Нові цифри сюжету: оферта B (Łazarz, 62 m², 842 000 zł), Wilda (61 m², 715 000 zł, лише g12), Grunwald (66 m², 690 000 zł, c3), дім у Komornikach (128 m², 1 190 000 zł, ДЗ). 🎬 «Oglądamy domy marzeń: Małe mieszkanie może być eleganckie» (88 тис. переглядів, 13.03.2026, ≈12 хв); повністю не переглянуто.

### 3a. Граматичний мінімум: уроки 03–12 (додано 24.11.2026)

Кожен урок: 25 слів (дієслова/іменники з робочого контексту), 6–10 блоків вправ (`t1–t2` до тексту + `g1–gN`), 3 рольові ситуації, ДЗ (hw + відео + награння + письмо). Розмовна частина ≥ 50%. Швидкість: усна «гумка» (інфінітив + особа → форма за 2 с) і блок «szybka runda». Теги тільки з реєстру.

| № | `lesson_id` | Тема | Що закриваємо | Робочий контекст |
|---|---|---|---|---|
| 03 | `pl-nier-03-czas-terazniejszy` | Mój dzień w biurze | теперішній час (4 групи + шість нерегулярних), Pan/Pani/Państwo + 3 ос., *chcę/mogę/muszę + bezokolicznik*, *wiem ≠ znam* | ранкова нарада, зустріч із Lisami, дзвінок до Zielińskiej |
| 04 | `pl-nier-04-rodzaj-i-przymiotnik` | Dwie oferty dla państwa Lisów | рід (m/ż/n) + винятки, множина речей/жінок, *drzwi, schody*, мужськоособова множина (*klienci, sąsiedzi, Lisowie*) + винятки (*ludzie, dzieci*), прикметник lp і lm (*ci/te*) | звіт про дві оферти, телефон Lisom, розмова з Zielińską |
| 05 | `pl-nier-05-biernik` | Odpowiadamy na e-mail pani Marty | biernik: żeńskie *-a→-ę*, rzecz / człowiek (*balkon, klienta*), множина (*klientów*), *ten/tego/tę* + прикметник, *Pana/Panią/Państwa*, *go/ją/je/ich*, прийменники *czekać na, pytać o, prosić o, dziękować za, w piątek, za godzinę*; виняток: *szukać, potrzebować, wymagać, słuchać* + dopełniacz (форми — урок 06; рядок плану «*szukam mieszkania*» — це родовий, не biernik) | відповідь на e-mail, запрошення, ключі й документи |
| 06 | `pl-nier-06-…` | Dopełniacz | *nie ma windy, pięć pokoi, dużo osób, bez balkonu* | характеристики, чого немає |
| 07 | `pl-nier-07-…` | Liczebniki i ceny | ціни, метраж, поверхи, дати, години | назвати ціну вголос |
| 08 | `pl-nier-08-…` | Miejscownik i przyimki | *w centrum, na trzecim piętrze*, *gdzie / dokąd / skąd* | розташування, район |
| 09 | `pl-nier-09-…` | Narzędnik, celownik, wołacz | *z właścicielem, dzwonię do Pana, Panie Pawle* | люди й контакти |
| 10 | `pl-nier-10-…` | Czas przeszły i przyszły, aspekt | *zadzwoniłam / zadzwonię*, dk vs ndk | підтвердження, плани |
| 11 | `pl-nier-11-…` | Prośby i polecenia | *proszę + bezokolicznik, niech Pan…, żeby* | інструкції клієнтам |
| 12 | `pl-nier-12-…` | Zdania złożone | *bo, dlatego, chociaż, jeśli, kiedy, który* + порівняння | аргументація, торг |

Уроки 03–12 **не повторюють** 01–02: 01 (ввічливість, залежні питання, парафраза) лишається; 02 (дієприкметники, ступінь) відкладено до 13–15 як «для B2», числівники з 02 переходять у 07. Порядок 04–12 коригується за журналом помилок з 03.

### 13 · Zapraszam do środka — огляд і заперечення клієнта
`pl-nier-13-prezentacja-i-obiekcje` · рівень B2

- **Мовленнєва дія:** провести огляд квартири, спокійно відповісти на заперечення, отримати зворотний зв'язок і домовитися про наступний крок.
- **Граматика:** `new` `przyzwolenie` · `przeciwstawienie` · `warunek-realny`; `rec` `imieslow-*`, `porownania`.
  Блоки: ① *chociaż / choć / mimo że* + речення ② *mimo / pomimo* + dopełniacz (*mimo braku windy*) ③ *natomiast / za to / jednak / mimo to* — значення й місце в реченні ④ техніка «tak, ale»: *Rzeczywiście…, ale za to…* ⑤ *jeśli / jeżeli* + майбутній час ⑥ *o ile, pod warunkiem że, chyba że* ⑦ *w razie* + dopełniacz (*w razie problemów*) — номінальний стиль B2.
  Wyjątki: *chociaż* = «хоча б» (*Chociaż zadzwoń!*); *jednak* може стояти в середині речення.
- **Pułapki:** *незважаючи на* → **mimo** + D (✗ *mimo na*) · *подивитися квартиру* → **obejrzeć** mieszkanie · *хоча б* → **chociaż / przynajmniej** · *у разі, якщо* → **jeśli / w razie** + D · *магазин поруч* → sklep **w pobliżu / niedaleko** · *за умови, що* → **pod warunkiem, że** (кома!).
- **Słownictwo:** ① prezentacja: obejrzeć, oprowadzić, zwrócić uwagę na, na pierwszy rzut oka ② wady: zawilgocenie, pęknięcie, nieszczelne okna, hałas, brak windy ③ okolica: infrastruktura, przystanek, plac zabaw, miejsce parkingowe, strefa płatnego parkowania ④ obiekcje: obawa, wątpliwość, zastrzeżenie, rozwiać wątpliwości, przemyśleć, wrócić z decyzją.
- **Czytanie:** колонка Natalii «Pięć obiekcji, które słyszę na każdej prezentacji» (як відповідати). e1 — prawda/fałsz.
- **Mówię płynnie:** *Rozumiem Pana obawy, ale… · To dobre pytanie. · Szczerze mówiąc… · Z drugiej strony… · Proszę spojrzeć na to tak:… · Co do…* Стратегія: **визнай → переформулюй → дай факт / вигоду**.
- **Zadania komunikacyjne:**
  1. Огляд квартири з Lisami (план квартири на картці; діалог-зразок + e2). *Zwrot:* Marta помічає пляму на стелі.
  2. «Ogień obiekcji»: 5 заперечень підряд (немає ліфта, високий czynsz, парковка, старі вікна, ціна) — на кожне ≥ 1 конструкція уроку. *Zwrot:* Paweł уперше каже, що парковка — умова.
  3. Розмова після огляду. *Zwrot:* «Musimy się zastanowić» → домовитися про конкретний термін відповіді, не тиснучи.
  - **Монолог 2 хв:** «Dlaczego warto kupić to mieszkanie mimo jego wad».
- **ДЗ:** hw · 🎬 відео про огляд квартири / на що дивитися при купівлі · 🎙️ відповіді на 3 **нові** заперечення (будинок, не квартира) · ✍️ звіт для pani Kaczmarek після огляду: реакції клієнтів, заперечення, наступні кроки (160–200).

### 14 · Ostatnie słowo — торг, zadatek, umowa przedwstępna
`pl-nier-14-negocjacje` · рівень B2

- **Мовленнєва дія:** передати пропозицію покупців власниці, вести торг як посередник, пом'якшувати категоричність, пояснити клієнту *zadatek* vs *zaliczka* й суть umowy przedwstępnej.
- **Граматика:** `new` `warunek-nierealny` · `by-ruchome` · `zeby-zyczenie`; пом'якшення — теги **`warunkowy-prosby`** і **`przypuszczajacy-formy`** (тегу `lagodzenie` у реєстрі немає; не створювати); `rec` `przyzwolenie`, `warunek-realny`, `przypuszczajacy-formy` (з 01).
  Блоки: ① повтор форм tryb przypuszczający (місток до 01) ② *gdyby* + przypuszczający — теперішнє (*Gdyby Pani zeszła z ceny, klienci podpisaliby…*) ③ *gdyby* — минуле (*Gdyby ogłoszenie pojawiło się wcześniej, …*) ④ рухоме -by: *gdybym, gdybyśmy, żebyś* ⑤ пом'якшення: *chyba, raczej, wydaje mi się, nie wiem, czy…* ⑥ безособове *można by, należałoby, warto by* ⑦ *zależy mi na tym, żeby… / klienci proszą, żeby…*
  Wyjątki: *jeśliby* — книжне й рідкісне, у розмові **gdyby** (не називати *jeśliby* помилкою); *gdyby* не = *якщо б* дослівно.
- **Pułapki:** *угода* → **umowa / transakcja** (*ugoda* = мирова угода!) · *знизити ціну* → **obniżyć cenę / zejść z ceny** · *укласти договір* → **zawrzeć umowę** · *завдаток* → **zadatek ≠ zaliczka** (різні наслідки) · *мені залежить* → **zależy mi na** + Msc · *пропозиція (ціни)* → **oferta / propozycja cenowa**.
- **Słownictwo:** ① cena: cena ofertowa / transakcyjna, obniżka, kontroferta, cena ostateczna ② pieniądze: zadatek, zaliczka, przelew, wkład własny, decyzja kredytowa ③ umowa: umowa przedwstępna, umowa przyrzeczona, termin, odstąpić od umowy, forma aktu notarialnego ④ negocjacje: ustępstwo, kompromis, warunki, spotkać się w połowie drogi.
- **Czytanie:** «Zadatek czy zaliczka? Krótki poradnik dla kupujących» (від імені біура «Klucz»; лише перевірені факти, Źródła обов'язково). e1 — prawda/fałsz.
- **Mówię płynnie:** *Wydaje mi się, że… · Proponowałabym… · Co by Pani powiedziała na…? · Muszę to skonsultować z klientami. · To nasza ostateczna propozycja. · Spotkajmy się w połowie drogi.* Стратегія: **інтерес, а не позиція** (чому клієнту важлива ціна / термін).
- **Zadania komunikacyjne:**
  1. Телефон до pani Zielińskiej: пропозиція Lisów 700 000 zł (діалог-зразок + e2). *Zwrot:* вона ображається — «to za mało, tu jest całe moje życie».
  2. Посередництво: викладач по черзі грає обидві сторони; приховані межі сторін — **лише на TEACHER** (Lisowie max ≈ 725 000, Zielińska min ≈ 715 000 + хоче лишити меблі кухні). *Zwrot:* Lisowie просять 3 місяці на кредит.
  3. Пояснити Lisom zadatek / zaliczka й umowę przedwstępną. *Zwrot:* «A jeśli bank nie da nam kredytu?»
  - **Монолог 2 хв:** «Gdybym była na miejscu sprzedającej, …» — аргументувати ціну.
- **Факти перевірити (пошуком, у Źródła):** zadatek — art. 394 Kodeksu cywilnego (наслідки невиконання); zaliczka — повертається; форма umowy przedwstępnej (звичайна письмова vs akt notarialny — різні наслідки); як зазвичай ставлять умову про кредит. Нічого з пам'яті.
- **ДЗ:** hw · 🎬 відео про торг / zadatek vs zaliczka · 🎙️ голосова kontroferta для іншого продавця (1,5 хв) · ✍️ формальний e-mail Zielińskiej з пропозицією покупців і аргументами (160–200).

### 15 · Od umowy do kluczy — формальності, оренда, фінальна симуляція
`pl-nier-15-formalnosci` · рівень B2

- **Мовленнєва дія:** пояснити клієнту кроки до aktu notarialnego й документи; перекласти офіційну мову на просту (для іноземця); провести повну симуляцію робочого дня.
- **Граматика:** `new` `bierna-byc-zostac` · `bezosobowe-no-to` · `bezosobowe-sie` · `odczasownikowe`; `rec` `warunek-nierealny`, `warunkowy-prosby`, `przyzwolenie`.
  Блоки: ① *być* vs *zostać* + imiesłów (стан vs подія: *umowa jest podpisana / została podpisana*) ② агент *przez* (*akt sporządzany przez notariusza*) ③ *-no / -to* (*podpisano, sprawdzono*) ④ *się* (*sprawdza się księgę wieczystą*) ⑤ *należy, trzeba, wymagane jest* ⑥ віддієслівні іменники офіційної мови (*zawarcie umowy, przeniesienie własności, wydanie lokalu*) ⑦ **z urzędowego na prosty**: *Wydanie lokalu nastąpi…* → *Klucze dostanie Pan…*
  Wyjątki: *zostać* у теперішньому (*umowa zostaje zawarta*) — тільки в описі процедур і в мові права.
- **Pułapki:** *застава (депозит)* → **kaucja** (*zastaw* = застава майна) · *здати / зняти квартиру* → **wynająć komuś / od kogoś** (одне дієслово!) · *прописка* → **zameldowanie** · *виписка з реєстру* → **odpis z księgi wieczystej** · *нотаріальний договір* → **akt notarialny** · *право власності* → **prawo własności**.
- **Słownictwo:** ① dokumenty: księga wieczysta, odpis, hipoteka, świadectwo charakterystyki energetycznej, zaświadczenie o braku zaległości, zaświadczenie o osobach zameldowanych ② u notariusza: notariusz, akt notarialny, sporządzić, przenieść własność, taksa notarialna, podatek PCC ③ przekazanie: wydać lokal, protokół zdawczo-odbiorczy, stan liczników, klucze ④ najem: umowa najmu okazjonalnego, oświadczenie o poddaniu się egzekucji, kaucja, okres wypowiedzenia, najemca, wynajmujący.
- **Czytanie:** «Od umowy przedwstępnej do kluczy — krok po kroku» (путівник біура) + короткий фрагмент офіційної мови (вигаданий пункт договору). e1 — prawda/fałsz. Źródła обов'язково.
- **Mówię płynnie:** *Najpierw…, następnie…, na koniec… · Chodzi o to, że… · Innymi słowy… · Mówiąc prościej… · Podsumowując…* Стратегія: **один крок — одне речення** для клієнта-іноземця.
- **Zadania komunikacyjne:**
  1. Пояснити Lisom шлях до aktu notarialnego й список документів (діалог-зразок + e2). *Zwrot:* у dziale IV KW є hipoteka Zielińskiej — пояснити, що це означає й як вирішується.
  2. Ravi Sharma (A2): пояснити просто najem okazjonalny, kaucję, protokół. *Zwrot:* «Czy mogę mieć kota? Czy mogę się zameldować?»
  3. **Symulacja końcowa:** 3 сцени по 4–5 хв (дзвінок → заперечення на огляді → торг), картки zwrotów akcji тягнуться навмання.
  - **Монолог 2 хв:** повтор діагностики з уроку 01 + порівняння за рубрикою (§4).
- **Факти перевірити (пошуком, у Źródła):** які документи зазвичай потрібні до продажу квартири на вторинному ринку; PCC (ставка й **чи діє звільнення для першого житла** — актуально для Lisów, які зараз винаймають); хто зазвичай платить taksę notarialną і PCC; najem okazjonalny — що обов'язково (oświadczenie w formie aktu notarialnego, lokal zastępczy, zgłoszenie do urzędu skarbowego — терміни); межа kaucji при najmie. Програми кредитування не згадувати, якщо чинність не перевірено на дату уроку.
- **ДЗ:** hw · 🎬 відео про купівлю квартири в Польщі крок за кроком / wynajem · 🎙️ пояснення процесу оренди для іноземця простою польською (2 хв) · ✍️ e-mail Raviemu: що підготувати до підписання umowy najmu й дня в'їзду (160–200).

---

#### Урок 04 — `pl-nier-04-rodzaj-i-przymiotnik` (25.11.2026)

- **Тема:** рід, множина, прикметник; тексти про дві оферти для Lisów (A: Jeżyce, 749 000 zł, без windy; B: Łazarz, 842 000 zł, з miejscem w garażu за доплату).
- **Граматика (5 порцій + gz):** рід за закінченням → винятки (*mężczyzna, nieruchomość, noc*) → пастка роду (*ліфт m / winda ż* …) · множина речей і жінок → *drzwi, schody, pieniądze* · прикметник lp (*jaki/jaka/jakie*) · мужськоособова множина → *ludzie, dzieci (te!), rodzice, bracia* · прикметник lm (*ci/te*) → пастка *ci чи te* · gz (рециклінг: *Pan/Pani/Państwo, mieć, być*).
- **Слова (25, 4 групи):** Ludzie w transakcji · Budynek i wnętrze · Papiery i pieniądze · Jaki? Jacy?
- **Пасток 6** (4 рід + 2 ci/te); довідники — `docs/ref/nouns-gender-plural.md`, `docs/ref/adjectives-nominative.md`.
- **ДЗ:** hw (h1–h5) · 🎬 Małycha Agency «Jak sprzedać mieszkanie w jeden weekend?» (id 647Zl9ohy7w; вбудову не перевірено) · 🎙️ дім у Komornikach для państwa Nowaków · ✍️ notatka до szefowej 110–140 слів.
- **Припущення:** мова глос — українська (діагностика §5 ще не проведена).

#### Урок 05 — `pl-nier-05-biernik` (25.11.2026)

- **Тема:** biernik; e-mail пані Марти до biura, відповідь Natalii (запрошення Lisów на п'ятницю, ключі до piwnicy, копія umowy, zaświadczenie).
- **Граматика (7 порцій + gz):** żeńskie -a→-ę → rzecz / człowiek → винятки (*mężczyzna, kolega, doradca* на -a) · множина (*= mianownik / = dopełniacz*) → *ludzi, dzieci, braci* · *ten/tego/tę* + przymiotnik · Pan/Pani/Państwo + *go/ją/je/ich* → пастка «Вас» · дієслова → винятки з родовим · прийменники → пастки (*czekam na, za godzinę, szukam mieszkania, pytam o*).
- **Слова (25, 4 групи):** Czasowniki z biernikiem · Z przyimkiem · Ludzie i miejsca · Papiery i terminy.
- **Пасток 6** (2 Pan/Państwo + 4 прийменники/rekcja); довідник — `docs/ref/accusative.md`.
- **ДЗ:** hw (h1–h5) · 🎬 Muniak Development «Jak kupić mieszkanie z kredytem hipotecznym — krok po kroku» (id GjQL7xSvF6E, 4:28; вбудову не перевірено) · 🎙️ відповідь на e-mail клієнта (2 хв) · ✍️ e-mail 110–140 слів.
- **Припущення:** мова глос — українська; вправ зі слухання немає; фото й обкладинка — нові (не повторюють 02, 04).

## 4. Діагностика й вимірювання прогресу

- **Урок 01, Rozgrzewka:** монолог 2–3 хв «Kim jestem i jak pracuję» → викладач записує (аудіо або нотатки) й оцінює за рубрикою B2 (§1, 0–3 × 5). На TEACHER — таблиця з балами й 5 найчастіших помилок → «журнал помилок».
- **Кожен урок:** журнал помилок поповнюється; 2–3 помилки з попереднього уроку свідомо «провокуються» в задачах.
- **Урок 15:** той самий монолог + симуляція → та сама рубрика → у Podsumowaniu учениця бачить різницю (на сторінці учня — лише її самооцінка «umiem / jeszcze ćwiczę», бали — на TEACHER).

## 5. Що з'ясувати на уроці 01 (записати сюди, перед уроком 02)

| Питання | Як впливає на 02–05 |
|---|---|
| Де працює: місто, агенція чи своя JDG, як довго | дзвінки й огляди в задачах — з районами її міста; сюжет Познані лишається |
| Продаж, оренда чи обидва | лише оренда → у 04 торг про czynsz і warunki najmu, у 05 акцент на najem; лише продаж → лінія Raviego скорочується до задачі 2 в 05 |
| Клієнти: поляки, українці, іноземці | українці → більше завдань «пояснити польською польські правила»; іноземці → більше «mówiąc prościej» |
| Найважчі ситуації зараз (телефон? торг? формальності?) | на цю тему — +1 задача й домашнє 🎙️ |
| Чи знає польську процедуру (KW, notariusz, PCC) | не знає → у 05 більше пояснень на TEACHER; знає → більше симуляції |
| Мова: українська чи російська як рідна | глоси й пастки — під мову (00_START_HERE §5) |

**Результат діагностики:** _(ще не проведено — заповнити після уроку 01 з ученицею: бали рубрики B2 + 5 найчастіших помилок + відповіді на таблицю вище; потім скоригувати уроки 02–15)_

## 6. Реєстр `grammar_point` модуля

Тільки теги з закритого реєстру (`docs/grammar-registry.json`) + службові `kalki-uk`, `slownictwo`. Перед кожним уроком — `python3 scripts/check_tags.py --changed`. **Не вигадувати** `-formy`/`-popraw`/`-wyjatki`.

| Тег | Що покриває | Урок |
|---|---|---|
| `pan-pani` | Pan/Pani/Państwo + 3 ос., ввічливі формули | 01 |
| `warunkowy-prosby` | ввічливе прохання умовним способом (*mógłby Pan…*) | 01 (rec 14–15) |
| `przypuszczajacy-formy` | форми трибу умовного | 01 (rec 14) |
| `grzecznosc-chcialbym` | *chciałbym / chciałabym*, ввічливі формули | 01 |
| `pytania-zalezne` | czy / jaki / ile / kiedy в залежному питанні, порядок слів | 01 |
| `mowa-zalezna` | парафраза й зміна особи (*Czyli…, Jeśli dobrze rozumiem…*) | 01 |
| `imieslow-bierny` | -ny/-ony/-ty в описі нерухомості | 02 |
| `imieslow-czynny` | -ący, заміна *który* | 02 |
| `stopniowanie` | вищий і найвищий ступінь, нерегулярні | 02 |
| `porownania` | niż/od, o wiele, im…tym, tak samo jak | 02 |
| `liczebniki-skladnia` | ціни, метри, кімнати, поверхи; dopełniacz після числівників | 02 |
| `koniugacja-am-asz` · `koniugacja-e-esz` · `koniugacja-e-isz` · `koniugacje` · `czasowniki-nieregularne` · `byc` · `miec` · `modalne-bezokolicznik` | теперішній час, нерегулярні, chcę/mogę/muszę + bezokolicznik | 03 |
| `rodzaj-rzeczownika` · `liczba-mnoga-mianownik` · `przymiotnik-mianownik` · `mn-mianownik-mos` · `rzecz-nieregularne` | рід, множина, прикметник lp/lm, ci/te, ludzie/dzieci/rodzice | 04 |
| `przyzwolenie` | chociaż, mimo że, mimo + D | 13 |
| `przeciwstawienie` | natomiast, za to, jednak, mimo to | 13 |
| `warunek-realny` | jeśli, o ile, pod warunkiem że, chyba że, w razie + D | 13 |
| `warunek-nierealny` | gdyby — теперішнє й минуле | 14 |
| `by-ruchome` | gdybym, żebyś, gdybyśmy | 14 |
| `warunkowy-prosby` + `przypuszczajacy-formy` | пом'якшення: chyba, raczej, wydaje mi się, można by, należałoby (**замість неіснуючого `lagodzenie`**) | 14 |
| `zeby-zyczenie` | zależy mi na tym, żeby; prosić, żeby | 14 |
| `bierna-byc-zostac` | być vs zostać + imiesłów, przez | 15 |
| `bezosobowe-no-to` | podpisano, sprawdzono | 15 |
| `bezosobowe-sie` | sprawdza się, należy, trzeba | 15 |
| `odczasownikowe` | zawarcie, przeniesienie, wydanie — офіційний стиль | 15 |

Усі теги, окрім `pan-pani`, `warunkowy-prosby`, `mowa-zalezna`, `grzecznosc-chcialbym` (перевірені `check_tags.py` в уроці 01), звірені з `grammar-registry.json` 21.11.2026 — є в реєстрі. Тегів `grzecznosc-pan-pani`, `parafraza`, `lagodzenie` у реєстрі **немає**.

Кожен урок тихо повторює два попередні: ≥ 6 слів + ≥ 1 граматична тема у вправах (запис на TEACHER). Сюжетний ланцюжок робить це природним.

## 7. Як замовляти урок (для сесії Sonnet)

Промпт: **«Урок 0N для ріелторки (`pl-nier`). Карта — `docs/CURRICULUM_PL-NIER.md` (репо) або `02_curricula/CURRICULUM_PL-NIER.md` (Project), правила — `00_START_HERE.md` + `LESSON_PROTOCOL.md` + `CLAUDE.md`.»** Один урок — одна сесія. Модуль уже існує на сайті (урок 01 створив); Notion не використовується. Фото — Unsplash (`images.unsplash.com`), відео — за v3.19 (YouTube, польською, 3–15 хв, ≥ 50 тис. переглядів, ≤ 2 років, oEmbed 200, статистика на TEACHER).

### Ворота якості — без цього урок не готовий

1. **Тексти — реальні жанри біура** (нотатка, оголошення, колонка, порадник), написані з нуля, з персонажами й цифрами з §2. Ніякого загального «Rynek nieruchomości w Polsce».
2. **Граматика — B2 там, де карта каже B2.** Не підміняти *gdyby* простим *jeśli*, пасив — безособовими *trzeba*. Кожен блок теорії — приклад із роботи ріелтора, не про погоду.
3. **Кожна задача має конфлікт або несподіванку** (zwrot akcji на TEACHER). Задача «опишіть квартиру» без опору клієнта — не B2.
4. **Факти права — тільки після пошуку**, з посиланням у Źródła (isap.sejm.gov.pl, gov.pl, ekw.ms.gov.pl). Неперевірене — не писати, а назвати в чаті. Ринкові звичаї (prowizja, хто платить) — «zwykle», з двох джерел або взагалі не згадувати.
5. **Пастки — справжні кальки** з української (список у карті — мінімум); правильні розмовні форми (*ja bym chciała*, *jeśliby*, *przedzwonię*) **не називати помилками**.
6. **Вправи «легко — можна, тупо — ні»**: кожен хибний варіант — реальна помилка україномовної людини; `accept[]` для порядку слів і синонімів (де інший порядок справді природний); `check_answers.py` → 0 ERR.
7. **Приклади не повторюються** між теорією, словником, вправами й домашкою; домашка — інша нерухомість / інший клієнт.
8. **Mówię płynnie** — розмовні маркери, які реально кажуть польські pośrednicy, а не книжні звороти.
9. Цифри сюжету однакові в усіх уроках (§2). Змінив — онови карту.
10. Наприкінці — статус уроку в таблиці нижче + в обох копіях карти (Project і `docs/`).

## 8. Статус

| # | lesson_id | Тема | Статус |
|---|---|---|---|
| 01 | `pl-nier-01-pierwszy-kontakt` | Dzwonię w sprawie ogłoszenia | ✅ на сайті 21.11.2026 (main 757d6dd; embed ✓ --remote; i18n ru/pl/en ✓); Notion — не створювався; діагностику ще не проведено |
| 02 | `pl-nier-02-opis-i-ogloszenie` | Mieszkanie z duszą | ✅ на сайті 23.11.2026 (embed ✓; i18n ru/pl/en ✓; без слухання) |
| 03 | `pl-nier-03-czas-terazniejszy` | Mój dzień w biurze | ✅ на сайті 24.11.2026 (main c0a77fe; embed ✓ --remote; i18n ru/pl/en ✓; аудіо читання ready) |
| 04 | `pl-nier-04-rodzaj-i-przymiotnik` | Dwie oferty dla państwa Lisów | ✅ на сайті 25.11.2026 (embed, i18n ru/pl/en ✓; аудіо читання — див. TEACHER «Факти»; 🎬 Małycha Agency 647Zl9ohy7w — вбудову не перевірено; обкладинка й фото в тексті — повтор із 02) |
| 05 | `pl-nier-05-biernik` | Odpowiadamy na e-mail pani Marty | ✅ на сайті 25.11.2026 (embed, i18n ru/pl/en ✓; аудіо читання — див. STATE; 🎬 Muniak GjQL7xSvF6E — вбудову не перевірено; без слухання) |
| 06–12 | _див. §3a_ | граматичний мінімум | — |
| 13 | `pl-nier-13-prezentacja-i-obiekcje` | Zapraszam do środka | — (було 03) |
| 14 | `pl-nier-14-negocjacje` | Ostatnie słowo | — (було 04) |
| 15 | `pl-nier-15-formalnosci` | Od umowy do kluczy | — (було 05) |
