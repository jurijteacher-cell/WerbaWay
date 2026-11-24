# Werba Way — курс A0 → A1 (v3, 2026-11-16)

Карта всього курсу. Новий чат генерує урок **лише за цим файлом і `LESSON_PROTOCOL.md` + `GRAMMAR_METHOD.md` + `CONTENT_SPEC.md`** — попередні уроки читати не треба: усе, що з них повторюється (граматика, слова, фрази, сюжет), записано в карті нижче.

**Запит у новому чаті:** «Урок 3.3» (або «Урок 21»). Агент бере рядок уроку з карти, два попередні рядки й рядки свого блоку, і генерує пакет за протоколом.

Теги `grammar_point` — лише з `GRAMMAR_REGISTRY.md`. Власного реєстру ця карта більше не тримає.

> v4: поле `traps` у карті — **кандидати**, а не квота. У урок потрапляє лише те, що пройшло три тести `GRAMMAR_METHOD.md` §3 (дві різні фрази; названий механізм; реалістична помилка). Для A0–A1 більшість пасток — з української, перевіряй, чи вони справжні.

**Готово на 2026-11-16: 2 уроки** — 01 Alfabet i czytanie, 02 Miękkie głoski i ł. Поза нумерацією існує урок «Wczoraj o siódmej: czas przeszły i godziny» (`pl-a1-01-wczoraj`): перекриває теми 13 і 33, поки їх немає.

**v3 (2026-11-16)** — після аудиту сходинки:
- **Дієвідміна `-am/-asz` переїхала з уроку 12 на урок 7.** Було: сім уроків (5–11) на іменниках, прикметниках і `być`/`mieć`, тобто ≈16 контактних годин, за які учень не може скласти звичайне речення з дієсловом. Тепер дієслово приходить третім уроком модуля 1. «Moja rodzina» переїхала на 12 (перший урок M2), `zaimek-dzierzawczy` — в урок 8 разом з прикметником.
- **Доданий кличний відмінок** (`wolacz`) — урок 9. Звертання (*Pani Ewo, Panie Adamie, Kasiu*) учень пише з уроку 3 і до кінця сходинки, а вчили його досі аж на A2-84 і в `pl-gram-b2-01`.
- **Урок 22 отримав пастку на родовий множини** (*dwa kilo* / *pięć jajek*): кількості в покупках ідуть раніше, ніж `liczebnik-rzeczownik` (30). До 30 множинні форми даються як закриті зразки, не як правило.
- Модуль M2 перейменований на «Mój dzień i moja rodzina», can-do модулів 1–2 перераховані.

---

## 1. Результат курсу

| Навичка | Наприкінці A1 учень… | Перевірка |
|---|---|---|
| **Mówienie** | говорить 3 хв про себе, свій день, минуле й плани з паузами ≤3 с; веде побутову розмову (магазин, лікар, орендодавець, телефон) | монолог + рольова гра, рубрика 0–10 |
| **Pisanie** | пише SMS, записку, e-mail на 60–80 слів, заповнює формуляр; правильно пише ą/ę, rz/ż, ó/u в словах курсу | лист за 4 пунктами, рубрика 0–10 |
| **Gramatyka** | вживає 3 дієвідміни, być/mieć, модальні, biernik, miejscownik, базові dopełniacz і narzędnik, минулий і майбутній час — і пояснює, навіщо форма в реченні | автотест + mastery ≥80% за тегом |
| **Rozumienie** | розуміє повільне мовлення на знайомі теми, оголошення, короткі тексти | слухання й читання в автотесті (слухання — лише з готовим аудіо, `LESSON_PROTOCOL.md` §7) |

**«Głos przed / po».** Урок 05 — перший хвилинний запис про себе. Той самий монолог записується на кожній контрольній і на іспиті. Усі записи лежать у Supabase Storage. Публікувати їх у рекламі можна лише з письмової згоди учня.

---

## 2. Як уроки зчеплені між собою

1. **Блоки.** Модуль = блок із 7 уроків: 5 нових → **Powtórka blokowa** (без нового, усе з блоку разом) → **Kontrolna** (тест + усне + письмо). Модуль 0 — 4 уроки, контроль вбудований в урок 04.
2. **Одна нова граматика на урок.** Поле `new` — 1–2 теги, які урок вводить або поглиблює (тег може повторитися в `new`, якщо урок дає новий аспект: `narzednik-zawod-z` в 6, 20 і 36; `rodzaj-rzeczownika` в 6 і 12). Урок із `integration: true` нової граматики не має. Поле `rec` — 2–4 теги з попередніх уроків, і кожен із них має отримати щонайменше 1 блок або 3 завдання у вправах. Так тег трапляється в ≥2 уроках, а Supabase рахує mastery лише тоді, коли тег закріплений у різних уроках.
3. **Дозволена граматика.** У тексті, діалозі й вправах уроку N можна вживати лише теги з `new` і `rec` уроків 1…N, а також готові фрази (`chunks`) уроків 1…N. Усе інше — заборонено, навіть якщо звучить природно. Приклад: до уроку 21 немає biernik як граматики, але *Mam brata* і *lubię kawę* можна, бо це chunks уроків 12 і 16.
4. **Слова.** `core` — 10–12 обов'язкових слів уроку, вони мають бути в словнику. Решта словника (до обсягу за рівнем) — на вибір генератора. У тексті, діалозі або вправах уроку N має бути ≥6 слів із `core` уроків N-1 і N-2. У повторенні блоку — ≥20 слів із `core` усього блоку.
5. **Формат `traps`.** Кожен пункт — справжня калька у форматі `укр → ✗ … → ✓ …`, а не правило. Правило пишеться на картку, пастка — лише те, де україномовний учень реально помиляється.
6. **Сюжет «Olena w Krakowie».** Усі тексти й діалоги курсу — історія однієї людини. Поле `story` задає епізод уроку. Персонажі постійні, тож учень щоразу впізнає людей і контекст, і нова лексика лягає на знайоме.
7. **Контрольна — з нових речень.** Жодне речення контрольної не береться з уроків блоку, але теги й слова — лише з блоку.

### Персонажі (незмінні)

| Ім'я | Хто | Як з нею / ним говорять |
|---|---|---|
| **Olena Kowalenko** | 29 років, графічна дизайнерка з Івано-Франківська, переїхала до Кракова працювати | головна героїня |
| **Taras** | її брат, 19 років, студент у Вроцлаві | на «ty», SMS і дзвінки |
| **pani Ewa Zielińska** | 60 років, власниця квартири Олени | лише **Pani** |
| **Marek Nowak** | 35 років, сусід, кухар у ресторані на Казімєжі | на «ty» з уроку 03 |
| **Kasia Wójcik** | 27 років, колега Олени | на «ty» |
| **pan Adam Lis** | 45 років, шеф Олени | лише **Pan** |

---

## 3. Структура й час

| | |
|---|---|
| Уроків | 46: модуль 0 — 4, модулі 1–6 — по 7 |
| Тривалість | 90 хв кожен |
| Контактних годин | 69 |
| Домашка | ~30 хв після уроку, разом ~23 год |
| Разом | ~92 год (типовий орієнтир для A1 — 80–100 год разом із самостійною роботою) |
| Темп | 2 уроки на тиждень — 23 тижні; 3 на тиждень — ~16 тижнів |

**Вхідний тест** (15 хв, автоматичний, режим `placement`): ≥70% — старт з модуля 1, менше — з модуля 0. Для «фальшивих початківців» модуль 0 стискається до уроків 01 і 04.

---

## 4. Рубрики A0–A1 (кожен критерій 0–2, разом 10)

**Mówienie:**

| Критерій | 0 | 1 | 2 |
|---|---|---|---|
| zadanie | не виконано | частково | усі пункти |
| plynnosc | паузи >5 с або перехід на українську | паузи 3–5 с | паузи ≤3 с |
| poprawnosc | цільова граматика не вживається | з помилками | переважно правильно |
| slownictwo | <3 слова блоку | 3–5 | ≥6 |
| wymowa | заважає розумінню | помилки не заважають | поодинокі помилки |

Для кожного запису викладач також вносить `speaking_seconds` — скільки секунд із відведеного часу учень реально говорив.

**Pisanie:** zadanie · gramatyka · slownictwo · pisownia (ą/ę, rz/ż, ó/u) · forma (звертання, закінчення, формат SMS / e-mail).

**Прохідні пороги:** контроль M0 — 60% автотесту; контрольні M1–M5 та іспит — автотест ≥70%, усне ≥6, письмо ≥6. Хто не склав, отримує урок повторки з даних (`get_review_items`) і перескладає лише провалену частину.

---

## 5. Теги

Канон — `GRAMMAR_REGISTRY.md`, рівні A0 і A1 (+ службові). Нових тегів у цій карті не вигадуємо: якщо теми немає в каноні, вона спершу додається туди.

Порядок уведення тегів у курсі: `wymowa-glosek`, `akcent`, `pisownia` (1–2) → `byc`, `pan-pani` (3) → `liczebniki-glowne`, `miec` (4) → `pytajniki` (5) → `narzednik-zawod-z`, `rodzaj-rzeczownika` (6) → `koniugacja-am-asz` (7) → `przymiotnik-mianownik`, `zaimek-dzierzawczy` (8) → `wolacz` (9) → `godzina` (13) → `koniugacja-e-isz`, `czasownik-sie` (14) → `koniugacja-e-esz` (15) → `modalne-bezokolicznik`, `lubic-podobac` (16) → `miejscownik-miejsce` (19) → `isc-jechac` (20) → `biernik-rzeczownik` (21) → `ceny-zloty`, `biernik-przymiotnik` (22) → `grzecznosc-chcialbym` (23) → `jesc-pic` (26) → `dopelniacz-ilosc` (27) → `dopelniacz-nie-ma`, `przeczenie-dopelniacz` (28) → `liczba-mnoga-mianownik` (29) → `liczebnik-rzeczownik` (30) → `czas-przeszly` (33) → `czas-przeszly-nieregularny` (34) → `czas-przyszly-bede` (35) → `grac-w-na` (36) → `data-podstawowa` (37) → `boli-mnie` (40) → `potrzebowac-dopelniacz` (41) → `rozkaznik-podstawowy` (42) → `pogoda-pory-roku` (43).

---

## 6. Can-do

`evidence: auto` — досягнуто, коли всі `tags` мають статус `mastered`. `evidence: rubric` — остання рубрика викладача ≥70% від максимуму.

```yaml
can_do:
  - {id: A0-M0-R1, module: A0-M0, skill: czytanie,  evidence: rubric, pl: "Potrafię przeczytać na głos każde polskie słowo."}
  - {id: A0-M0-S1, module: A0-M0, skill: mowienie,  evidence: rubric, pl: "Potrafię się przywitać i przedstawić."}
  - {id: A0-M0-G1, module: A0-M0, skill: gramatyka, evidence: auto, tags: [liczebniki-glowne, miec], pl: "Potrafię podać wiek i numer telefonu."}
  - {id: A1-M1-S1, module: A1-M1, skill: mowienie,  evidence: rubric, pl: "Potrafię mówić o sobie przez minutę."}
  - {id: A1-M1-W1, module: A1-M1, skill: pisanie,   evidence: rubric, pl: "Potrafię napisać krótki tekst o sobie."}
  - {id: A1-M1-G1, module: A1-M1, skill: gramatyka, evidence: auto, tags: [rodzaj-rzeczownika, przymiotnik-mianownik, zaimek-dzierzawczy], pl: "Potrafię dopasować przymiotnik i zaimek do rzeczownika."}
  - {id: A1-M1-G2, module: A1-M1, skill: gramatyka, evidence: auto, tags: [pan-pani, byc, wolacz], pl: "Potrafię rozmawiać i pisać formalnie z Panem i z Panią."}
  - {id: A1-M1-G3, module: A1-M1, skill: gramatyka, evidence: auto, tags: [koniugacja-am-asz], pl: "Potrafię powiedzieć, co robię codziennie."}
  - {id: A1-M2-S1, module: A1-M2, skill: mowienie,  evidence: rubric, pl: "Potrafię opowiedzieć o swoim dniu i o rodzinie."}
  - {id: A1-M2-W1, module: A1-M2, skill: pisanie,   evidence: rubric, pl: "Potrafię napisać e-mail o swoim dniu."}
  - {id: A1-M2-G1, module: A1-M2, skill: gramatyka, evidence: auto, tags: [koniugacja-e-isz, koniugacja-e-esz, czasownik-sie], pl: "Potrafię odmienić czasownik w czasie teraźniejszym."}
  - {id: A1-M2-G2, module: A1-M2, skill: gramatyka, evidence: auto, tags: [godzina, modalne-bezokolicznik], pl: "Potrafię umówić się na konkretną godzinę."}
  - {id: A1-M3-S1, module: A1-M3, skill: mowienie,  evidence: rubric, pl: "Potrafię kupić coś w sklepie i zapytać o drogę."}
  - {id: A1-M3-W1, module: A1-M3, skill: pisanie,   evidence: rubric, pl: "Potrafię napisać, jak dojechać, i wypełnić formularz."}
  - {id: A1-M3-G1, module: A1-M3, skill: gramatyka, evidence: auto, tags: [biernik-rzeczownik, miejscownik-miejsce], pl: "Potrafię powiedzieć, co kupuję i gdzie jestem."}
  - {id: A1-M3-G2, module: A1-M3, skill: gramatyka, evidence: auto, tags: [ceny-zloty, isc-jechac], pl: "Potrafię podać cenę i powiedzieć, jak jadę."}
  - {id: A1-M4-S1, module: A1-M4, skill: mowienie,  evidence: rubric, pl: "Potrafię zamówić jedzenie i zapytać o mieszkanie."}
  - {id: A1-M4-W1, module: A1-M4, skill: pisanie,   evidence: rubric, pl: "Potrafię napisać notatkę i ogłoszenie."}
  - {id: A1-M4-G1, module: A1-M4, skill: gramatyka, evidence: auto, tags: [dopelniacz-nie-ma, przeczenie-dopelniacz, dopelniacz-ilosc], pl: "Potrafię powiedzieć, czego nie ma i ile czegoś potrzebuję."}
  - {id: A1-M4-G2, module: A1-M4, skill: gramatyka, evidence: auto, tags: [liczba-mnoga-mianownik, liczebnik-rzeczownik], pl: "Potrafię opisać mieszkanie: ile jest pokoi i jakie są."}
  - {id: A1-M5-S1, module: A1-M5, skill: mowienie,  evidence: rubric, pl: "Potrafię opowiedzieć o weekendzie i planach."}
  - {id: A1-M5-W1, module: A1-M5, skill: pisanie,   evidence: rubric, pl: "Potrafię napisać e-mail o weekendzie i odpowiedzieć na zaproszenie."}
  - {id: A1-M5-G1, module: A1-M5, skill: gramatyka, evidence: auto, tags: [czas-przeszly, czas-przeszly-nieregularny, czas-przyszly-bede], pl: "Potrafię mówić o przeszłości i przyszłości."}
  - {id: A1-M6-S1, module: A1-M6, skill: mowienie,  evidence: rubric, pl: "Potrafię załatwić sprawę u lekarza, w urzędzie i przez telefon."}
  - {id: A1-M6-W1, module: A1-M6, skill: pisanie,   evidence: rubric, pl: "Potrafię napisać e-mail na 60–80 słów."}
  - {id: A1-M6-G1, module: A1-M6, skill: gramatyka, evidence: auto, tags: [boli-mnie, potrzebowac-dopelniacz, rozkaznik-podstawowy], pl: "Potrafię powiedzieć, co mi dolega i czego potrzebuję."}
```

---

## 7. Карта уроків

Поля: `n` — наскрізний номер (він же у slug: `pl-a1-21-poprosze`); `cid` — номер у модулі; `kind` — `lesson | review | checkpoint | exam`; `story` — епізод; `new` / `rec` — теги; `core` — обов'язкові слова; `chunks` — готові фрази, дозволені до того, як їхня граматика стане темою; `comm` — дві комунікаційні задачі; `write` — письмове завдання уроку; `traps` — кандидати в пастки з української (див. примітку v4 вгорі).

Для `review` і `checkpoint` поля `new` і `core` порожні: вони працюють лише з тегами й словами свого блоку.

```yaml
modules:
  - {id: A0-M0, level: A0, sort: 0, pl: "Start", uk: "Старт", wow: "хв 5 — не читає «Szczecin · Wrocław · Szczebrzeszyn», хв 45 — читає", lessons: [1, 4]}
  - {id: A1-M1, level: A1, sort: 1, pl: "Ja i ludzie wokół mnie", uk: "Я і люди навколо", wow: "«Głos przed» (05) → «Głos po» (11)", lessons: [5, 11]}
  - {id: A1-M2, level: A1, sort: 2, pl: "Mój dzień i moja rodzina", uk: "Мій день і моя родина", wow: "«Mój dzień» 90 секунд без підглядання", lessons: [12, 18]}
  - {id: A1-M3, level: A1, sort: 3, pl: "W mieście", uk: "У місті", wow: "рольова гра «важкий продавець»: 5 покупок за списком", lessons: [19, 25]}
  - {id: A1-M4, level: A1, sort: 4, pl: "Jedzenie i dom", uk: "Їжа і дім", wow: "дзвінок орендодавцю з 5 питаннями", lessons: [26, 32]}
  - {id: A1-M5, level: A1, sort: 5, pl: "Wczoraj i jutro", uk: "Учора і завтра", wow: "2 хв «мої вихідні й плани» без української", lessons: [33, 39]}
  - {id: A1-M6, level: A1, sort: 6, pl: "Sprawy praktyczne", uk: "Практичні справи", wow: "«Głos po» проти запису з уроку 05", lessons: [40, 46]}

lessons:
  # ---------- M0 · Start (A0) ----------
  - n: 1
    cid: "0.1"
    slug: alfabet
    kind: lesson
    status: done
    title: "Alfabet i czytanie"
    story: "Olena jedzie pociągiem do Krakowa i czyta nazwy stacji."
    new: [wymowa-glosek, akcent, pisownia]
    rec: []
    core: [dzień dobry, dziękuję, przepraszam, pociąg, bilet, dworzec, peron, stacja, Kraków, Wrocław]
    chunks: ["Dzień dobry.", "Dziękuję.", "Przepraszam."]
    comm: ["Przeliteruj swoje imię konduktorowi.", "Zapytaj, czy to pociąg do Krakowa."]
    write: "Imię, nazwisko i miasto z ogonkami."
    traps: ["ch i h czyta się tak samo", "rz ≠ «рз»", "ę na końcu słowa czyta się prawie jak e"]
  - n: 2
    cid: "0.2"
    slug: glosk
    kind: lesson
    status: done
    title: "Miękkie głoski i ł"
    story: "Olena na dworcu pyta o drogę i pierwszy raz rozmawia z panią Ewą przez telefon."
    new: [wymowa-glosek, akcent]
    rec: [pisownia]
    core: [cześć, proszę, tak, nie, dobrze, źle, ulica, miasto, dzień, noc, łóżko]
    chunks: ["Jestem Olena.", "Mieszkam w Krakowie."]
    comm: ["Powiedz taksówkarzowi adres — przeliteruj nazwę ulicy.", "Przedstaw się przez telefon."]
    write: "Dyktando: 5 słów z ś, ć, ź, ń, ł."
    traps: ["ł ≠ українське л", "ó czyta się jak u", "si = ś, ci = ć"]
  - n: 3
    cid: "0.3"
    slug: pan-czy-ty
    kind: lesson
    title: "Dzień dobry — Pan czy ty?"
    story: "Olena poznaje panią Ewę (formalnie) i sąsiada Marka (na ty)."
    new: [byc, pan-pani]
    rec: [wymowa-glosek]
    core: [pan, pani, sąsiad, sąsiadka, do widzenia, na razie, miło mi, jak się masz, bardzo, też]
    chunks: ["Miło mi.", "Jak się Pan / Pani ma?", "Jak się masz?"]
    comm: ["Przywitaj się z właścicielką mieszkania.", "Poznaj sąsiada na klatce schodowej."]
    write: "SMS: «Dzień dobry, tu Olena…»"
    traps: ["«ви» → ✗ wy → ✓ Pan / Pani", "«як справи?» → ✓ Jak się masz?", "«дякую, добре» → ✓ Dziękuję, dobrze."]
  - n: 4
    cid: "0.4"
    slug: liczby-kontakt
    kind: lesson
    title: "Liczby i kontakt"
    story: "Olena podpisuje umowę najmu: podaje telefon, e-mail i wiek."
    new: [liczebniki-glowne, miec]
    rec: [byc, pan-pani]
    core: [numer, telefon, e-mail, małpa, kropka, imię, nazwisko, adres, lat, umowa]
    chunks: ["Mam … lat.", "Mój numer to…", "Mam na imię…"]
    comm: ["Podaj numer telefonu i e-mail — pani Ewa zapisuje.", "Zapytaj, ile lat ma sąsiad."]
    write: "Formularz: imię, nazwisko, telefon, e-mail, adres."
    traps: ["«мені 25» → ✗ mnie 25 → ✓ mam 25 lat", "«собачка» у пошті → ✓ małpa", "2, 3, 4 lata, ale 5 lat"]
    note: "Останні 20 хв — контроль M0: читання 20 слів уголос (запис), диктант 10 слів, автотест 15 завдань."

  # ---------- M1 · Ja i ludzie wokół mnie ----------
  - n: 5
    cid: "1.1"
    slug: kim-jestes
    kind: lesson
    title: "Kim jesteś?"
    story: "Pierwszy dzień Oleny w pracy — przedstawia się zespołowi i szefowi."
    new: [byc, pytajniki]
    rec: [pan-pani, liczebniki-glowne]
    core: [Ukrainka, Ukrainiec, Polka, Polak, kraj, praca, zespół, skąd, kolega, koleżanka, szef]
    chunks: ["Jestem z Ukrainy.", "Mieszkam w Krakowie od miesiąca.", "Pracuję jako…"]
    comm: ["Przedstaw się nowemu zespołowi.", "Zapytaj kolegę, skąd jest i gdzie mieszka."]
    write: "3 zdania o sobie."
    traps: ["✗ z Ukraina → ✓ z Ukrainy", "Ukrainka (ona), Ukrainiec (on)", "✗ ja jestem Olena z Ukraina"]
    note: "Запис «Głos przed»: 1 хв про себе."
  - n: 6
    cid: "1.2"
    slug: co-robisz
    kind: lesson
    title: "Co robisz?"
    story: "Olena i Kasia rozmawiają o pracy przy kawie."
    new: [narzednik-zawod-z, rodzaj-rzeczownika]
    rec: [byc, pytajniki]
    core: [graficzka, grafik, programista, lekarz, lekarka, nauczyciel, nauczycielka, student, studentka, biuro, firma]
    chunks: ["Pracuję jako…", "Jestem graficzką."]
    comm: ["Opowiedz, gdzie i kim pracujesz.", "Zapytaj koleżankę o jej pracę."]
    write: "Profil na portalu zawodowym: 4 zdania."
    traps: ["pracuję jako lekarz, ale jestem lekarzem", "✗ jestem lekarz → ✓ jestem lekarzem", "graficzka ≠ «графік роботи»"]
  - n: 7
    cid: "1.3"
    slug: codziennie
    kind: lesson
    title: "Co robisz codziennie?"
    story: "Tydzień Oleny: praca, zakupy, siłownia, telefon do Tarasa."
    new: [koniugacja-am-asz]
    rec: [byc, narzednik-zawod-z, pan-pani]
    core: [codziennie, rano, wieczorem, zawsze, często, rzadko, nigdy, czytać, mieszkać, śniadanie, tydzień]
    chunks: ["w poniedziałek", "we wtorek", "w środę"]
    comm: ["Opowiedz o swoim tygodniu.", "Zapytaj partnera, co robi wieczorem."]
    write: "Plan tygodnia: 7 krótkich zdań."
    traps: ["dni tygodnia małą literą", "✗ w środa → ✓ w środę", "✗ ja czytam codziennie → ✓ czytam codziennie (bez ja)"]
    note: "Перший урок із дієвідміною: до нього дієслова йшли лише як chunks (jestem, mam, mieszkam, pracuję jako)."
  - n: 8
    cid: "1.4"
    slug: jaki-jaka
    kind: lesson
    title: "Jaki? Jaka? Jakie?"
    story: "Olena pisze do mamy e-mail o nowych ludziach: Kasi, Marku, pani Ewie, panu Adamie."
    new: [przymiotnik-mianownik, zaimek-dzierzawczy]
    rec: [rodzaj-rzeczownika, koniugacja-am-asz, byc]
    core: [wysoki, niski, młody, stary, miły, sympatyczny, zabawny, spokojny, ładny, nowy, duży, mały]
    chunks: ["Jaki on jest?", "Ona jest bardzo miła."]
    comm: ["Opisz koleżankę tak, żeby partner zgadł, kto to.", "Opowiedz o swoim nowym sąsiedzie."]
    write: "Opis przyjaciela, 40 słów."
    traps: ["miły = приємний, не «милий»", "uroda = краса", "✗ ona jest miły → ✓ miła", "✗ moja sąsiad → ✓ mój sąsiad"]
  - n: 9
    cid: "1.5"
    slug: ty-czy-pan
    kind: lesson
    title: "Ty czy Pan / Pani?"
    story: "Olena pisze do pani Ewy w sprawie klucza i SMS do Marka w sprawie kawy."
    new: [wolacz, pan-pani]
    rec: [byc, przymiotnik-mianownik, koniugacja-am-asz]
    core: [czy, można, oczywiście, niestety, wiadomość, spotkanie, jutro, dzisiaj, klucz, pytanie]
    chunks: ["Czy mogę…?", "Czy ma Pani chwilę?"]
    comm: ["Zapytaj szefa (Pan) i koleżankę (ty) o to samo.", "Poproś właścicielkę o drugi klucz."]
    write: "Formalny e-mail i nieformalny SMS — ta sama sprawa, z poprawnym zwrotem do adresata."
    traps: ["✗ Czy Pan masz → ✓ Czy Pan ma", "«пані Ево» → ✓ Pani Ewo (не Pani Ewa)", "✗ Kasia, cześć! → ✓ Kasiu, cześć!", "Państwo = ви до групи"]
    note: "Кличний відмінок уводиться тут, бо з уроку 03 учень пише звертання в SMS і листах. Обсяг: Pani + ім'я, Panie + ім'я, жіночі імена на -o/-u, Szanowny Panie / Szanowna Pani як готова форма."
  - n: 10
    cid: "1.6"
    slug: powtorka-m1
    kind: review
    title: "Powtórka: ja i ludzie"
    story: "Firmowa kolacja — Olena przedstawia wszystkich znajomych."
    new: []
    rec: [byc, pytajniki, narzednik-zawod-z, rodzaj-rzeczownika, koniugacja-am-asz, przymiotnik-mianownik, zaimek-dzierzawczy, pan-pani, wolacz]
    core: []
    chunks: []
    comm: ["Przedstaw trzy osoby z firmy: kim są, jacy są.", "Rozmowa z szefem i z koleżanką — zmień formę."]
    write: "Popraw swój tekst z lekcji 08 i dopisz 3 zdania."
    traps: []
  - n: 11
    cid: "1.7"
    slug: kontrolna-m1
    kind: checkpoint
    title: "Kontrolna: ja i ludzie"
    story: "Nowy pracownik w firmie Oleny — kolejne «pierwsze spotkanie»."
    new: []
    rec: [byc, pytajniki, narzednik-zawod-z, rodzaj-rzeczownika, koniugacja-am-asz, przymiotnik-mianownik, zaimek-dzierzawczy, pan-pani, wolacz]
    core: []
    chunks: []
    comm: ["Monolog 1 min o sobie («Głos po»).", "Rozmowa: poznajesz nowego sąsiada."]
    write: "Napisz o sobie, 50 słów."
    traps: []
    can_do: [A1-M1-S1, A1-M1-W1, A1-M1-G1, A1-M1-G2, A1-M1-G3]

  # ---------- M2 · Mój dzień i moja rodzina ----------
  - n: 12
    cid: "2.1"
    slug: rodzina
    kind: lesson
    title: "Moja rodzina"
    story: "Olena pokazuje Kasi zdjęcia rodziny: mama, tata i brat Taras; wieczorem dzwoni do domu."
    new: [rodzaj-rzeczownika]
    rec: [zaimek-dzierzawczy, koniugacja-am-asz, liczebniki-glowne, miec]
    core: [rodzina, mama, tata, brat, siostra, dziecko, mąż, żona, babcia, dziadek, zdjęcie]
    chunks: ["To jest mój brat.", "Mam brata i siostrę."]
    comm: ["Pokaż zdjęcie rodziny i opowiedz, kto jest kim.", "Zapytaj koleżankę o jej rodzinę."]
    write: "Podpisy do 4 zdjęć rodzinnych."
    traps: ["dziecko — rodzaj nijaki", "mężczyzna — męski, choć na -a", "✗ moja brat → ✓ mój brat"]
    note: "Другий урок із `rodzaj-rzeczownika` у `new`: 06 дав рід на професіях, тут — nijaki (dziecko), męskie na -a (mężczyzna) і родинні пари."
  - n: 13
    cid: "2.2"
    slug: ktora-godzina
    kind: lesson
    title: "Która godzina?"
    story: "Olena umawia się z Kasią na kawę po pracy, ale spotkanie się przesuwa."
    new: [godzina]
    rec: [koniugacja-am-asz, liczebniki-glowne, pan-pani]
    core: [godzina, minuta, wpół do, kwadrans, o której, kawiarnia, wcześnie, późno, po pracy, zaraz]
    chunks: ["o ósmej", "Do zobaczenia o piątej!"]
    comm: ["Umów się na kawę — ustal dzień i godzinę.", "Zadzwoń, że się spóźnisz, i podaj nową godzinę."]
    write: "SMS: umówienie spotkania."
    traps: ["✗ o osiem → ✓ o ósmej", "wpół do ósmej = 7:30", "«о пів на восьму» ≈ wpół do ósmej"]
  - n: 14
    cid: "2.3"
    slug: mowie-po-polsku
    kind: lesson
    title: "Mówię po polsku"
    story: "Olena zapisuje się na kurs polskiego; Taras dzwoni i pyta, jak jej idzie."
    new: [koniugacja-e-isz, czasownik-sie]
    rec: [godzina, koniugacja-am-asz, byc]
    core: [mówić, rozumieć, uczyć się, język, po polsku, po angielsku, słowo, powtórzyć, wolno, szybko, trudny, łatwy]
    chunks: ["Proszę mówić wolniej.", "Nie rozumiem."]
    comm: ["Zapytaj o kurs językowy: kiedy i ile godzin.", "Poproś rozmówcę, żeby mówił wolniej i powtórzył."]
    write: "Wiadomość do nauczyciela: dlaczego uczysz się polskiego."
    traps: ["✗ uczę polski → ✓ uczę się polskiego", "mówię po polsku (bez języka)", "✗ ja rozumiem → ✓ rozumiem (bez ja)"]
  - n: 15
    cid: "2.4"
    slug: pisze-pracuje
    kind: lesson
    title: "Piszę i pracuję"
    story: "Dzień pracy Oleny: zebranie z panem Adamem, projekt dla klienta, przerwa na obiad."
    new: [koniugacja-e-esz]
    rec: [koniugacja-e-isz, godzina, narzednik-zawod-z]
    core: [pisać, pracować, projekt, klient, komputer, zebranie, przerwa, obiad, wracać, zaczynać, kończyć]
    chunks: ["Idę do pracy.", "Wracam do domu o szóstej."]
    comm: ["Opowiedz szefowi, co dziś robisz.", "Zapytaj kolegę, o której zaczyna i kończy pracę."]
    write: "Opis dnia pracy, 6 zdań."
    traps: ["✗ pracowuję → ✓ pracuję", "✗ zaczynam o dziewięć → ✓ zaczynam o dziewiątej", "«закінчую о 5» → ✓ kończę o piątej"]
  - n: 16
    cid: "2.5"
    slug: lubie-chce-musze
    kind: lesson
    title: "Lubię, chcę, muszę"
    story: "Marek zaprasza Olenę na kolację, ale ona musi pracować; rozmawiają o tym, co lubią."
    new: [modalne-bezokolicznik, lubic-podobac]
    rec: [koniugacja-e-esz, koniugacja-am-asz, czasownik-sie]
    core: [lubić, chcieć, móc, musieć, podobać się, kino, muzyka, sport, gotować, spacer, czas wolny]
    chunks: ["Lubię kawę.", "Podoba mi się Kraków."]
    comm: ["Zaproś kogoś na wieczór i przyjmij odmowę.", "Opowiedz, co lubisz, a czego nie lubisz robić."]
    write: "Odpowiedź na ogłoszenie «Szukam współlokatora»."
    traps: ["podoba mi się = мені подобається", "✗ ja muszę pracuję → ✓ muszę pracować", "lubię + bezokolicznik: lubię gotować"]
  - n: 17
    cid: "2.6"
    slug: powtorka-m2
    kind: review
    title: "Powtórka: mój dzień i rodzina"
    story: "Komiks: jeden zwykły dzień Oleny od 7:00 do 23:00, wieczorem rozmowa z rodziną."
    new: []
    rec: [rodzaj-rzeczownika, godzina, koniugacja-e-isz, czasownik-sie, koniugacja-e-esz, modalne-bezokolicznik, lubic-podobac]
    core: []
    chunks: []
    comm: ["Opowiedz dzień Oleny z komiksu.", "Ustal z partnerem wspólny wolny wieczór w tym tygodniu."]
    write: "Popraw plan tygodnia z lekcji 07 i dodaj godziny."
    traps: []
  - n: 18
    cid: "2.7"
    slug: kontrolna-m2
    kind: checkpoint
    title: "Kontrolna: mój dzień i rodzina"
    story: "Kasia prosi Olenę o pomoc w planie tygodnia nowego kolegi."
    new: []
    rec: [rodzaj-rzeczownika, godzina, koniugacja-e-isz, czasownik-sie, koniugacja-e-esz, modalne-bezokolicznik, lubic-podobac]
    core: []
    chunks: []
    comm: ["Monolog 90 s: mój dzień.", "Rozmowa: umów się na spotkanie."]
    write: "E-mail do nowego znajomego o swoim dniu, 50–60 słów."
    traps: []
    can_do: [A1-M2-S1, A1-M2-W1, A1-M2-G1, A1-M2-G2]

  # ---------- M3 · W mieście ----------
  - n: 19
    cid: "3.1"
    slug: gdzie-jest
    kind: lesson
    title: "Gdzie jest…?"
    story: "Olena szuka poczty, banku i apteki w swojej nowej dzielnicy."
    new: [miejscownik-miejsce]
    rec: [pytajniki, modalne-bezokolicznik, godzina]
    core: [bank, poczta, apteka, sklep, przystanek, obok, naprzeciwko, blisko, daleko, prosto, w lewo, w prawo]
    chunks: ["Przepraszam, gdzie jest…?", "Proszę iść prosto."]
    comm: ["Zapytaj przechodnia o drogę do apteki.", "Wyjaśnij turyście, gdzie jest przystanek."]
    write: "Instrukcja dojścia z domu do sklepu."
    traps: ["na poczcie, ale w banku", "✗ w poczcie → ✓ na poczcie", "obok + dopełniacz jako chunk: obok banku"]
  - n: 20
    cid: "3.2"
    slug: jak-dojechac
    kind: lesson
    title: "Jak dojechać?"
    story: "Olena jedzie tramwajem do biura, wsiada w złą linię i się spóźnia."
    new: [isc-jechac, narzednik-zawod-z]
    rec: [miejscownik-miejsce, godzina, modalne-bezokolicznik]
    core: [autobus, tramwaj, bilet, przesiadka, linia, pieszo, spóźnić się, wysiadać, wsiadać, kierowca]
    chunks: ["Jadę tramwajem.", "Spóźnię się dziesięć minut.", "Idę do sklepu.", "Jadę do centrum."]
    comm: ["Zapytaj kierowcę, czy ten tramwaj jedzie do centrum.", "Zadzwoń do szefa, że się spóźnisz."]
    write: "SMS: «Spóźnię się, jadę tramwajem…»"
    traps: ["✗ jadę na autobusie → ✓ jadę autobusem", "iść = пішки, jechać = транспортом", "✗ idę do Warszawy → ✓ jadę do Warszawy"]
  - n: 21
    cid: "3.3"
    slug: poprosze
    kind: lesson
    title: "Poproszę…"
    story: "Pierwsze duże zakupy Oleny w sklepie osiedlowym; Marek podpowiada, gdzie co kupić."
    new: [biernik-rzeczownik]
    rec: [miejscownik-miejsce, isc-jechac, liczebniki-glowne, lubic-podobac]
    core: [chleb, masło, mleko, woda, ser, jajko, jabłko, pomidor, kawa, herbata, kasa, poproszę]
    chunks: ["Poproszę…", "Coś jeszcze?", "To wszystko."]
    comm: ["Kup 5 produktów z listy w sklepie.", "Zapytaj sąsiada, gdzie kupić dobry chleb."]
    write: "Lista zakupów + SMS do brata: co kupujesz na kolację."
    traps: ["попрошу воду → ✗ poproszę woda → ✓ poproszę wodę", "маю брата → ✗ mam brat → ✓ mam brata", "шукаю сир → ✗ szukam ser → ✓ szukam sera (szukać + dopełniacz — як фраза)"]
  - n: 22
    cid: "3.4"
    slug: ile-kosztuje
    kind: lesson
    title: "Ile to kosztuje?"
    story: "Olena kupuje używany rower od znajomego Marka i negocjuje cenę."
    new: [ceny-zloty, biernik-przymiotnik]
    rec: [biernik-rzeczownik, pan-pani, liczebniki-glowne]
    core: [złoty, grosz, cena, tani, drogi, rower, sprzedać, kupić, płacić, kartą, gotówką, za drogo]
    chunks: ["Ile to kosztuje?", "Czy mogę zapłacić kartą?", "dwa kilo", "pięć jajek"]
    comm: ["Negocjuj cenę roweru.", "Zapytaj w kawiarni o cenę i zapłać."]
    write: "Ogłoszenie «Sprzedam…» z ceną."
    traps: ["✗ pięć złote → ✓ pięć złotych", "dwa złote, ale pięć złotych", "дві кави → ✓ dwie kawy, але п'ять кав → ✓ pięć kaw", "✗ poproszę duża kawa → ✓ dużą kawę"]
    note: "Кількості 2–4 / 5+ даються тут як закриті зразки (ціни, порції), бо правило `liczebnik-rzeczownik` приходить аж у 30. У вправах — лише слова з core цього блоку, без виведення правила."
  - n: 23
    cid: "3.5"
    slug: poczta-paczkomat
    kind: lesson
    title: "Na poczcie i w paczkomacie"
    story: "Olena wysyła paczkę z prezentem do mamy w Iwano-Frankiwsku."
    new: [grzecznosc-chcialbym]
    rec: [biernik-rzeczownik, ceny-zloty, miejscownik-miejsce]
    core: [paczka, list, znaczek, koperta, nadać, odebrać, paczkomat, kod, formularz, okienko]
    chunks: ["Chciałabym nadać paczkę.", "Proszę wypełnić formularz."]
    comm: ["Nadaj paczkę za granicę i zapytaj o cenę i czas.", "Odbierz paczkę — nie masz kodu."]
    write: "Formularz nadania paczki."
    traps: ["«хотіла б» → ✗ chciała bym → ✓ chciałabym", "✗ proszę wypełniać → ✓ proszę wypełnić (jednorazowo)", "nadać paczkę ≠ «надати»"]
  - n: 24
    cid: "3.6"
    slug: powtorka-m3
    kind: review
    title: "Powtórka: w mieście"
    story: "Gra miejska: Olena i Kasia wykonują zadania w pięciu miejscach Krakowa."
    new: []
    rec: [miejscownik-miejsce, isc-jechac, narzednik-zawod-z, biernik-rzeczownik, ceny-zloty, biernik-przymiotnik, grzecznosc-chcialbym]
    core: []
    chunks: []
    comm: ["Gra miejska w parach: pięć miejsc, pięć zadań.", "Kupujesz 3 rzeczy — sprzedawca ciągle się myli."]
    write: "Popraw instrukcję dojścia z lekcji 19 i dodaj transport."
    traps: []
  - n: 25
    cid: "3.7"
    slug: kontrolna-m3
    kind: checkpoint
    title: "Kontrolna: w mieście"
    story: "Taras przyjeżdża do Krakowa i Olena tłumaczy mu miasto."
    new: []
    rec: [miejscownik-miejsce, isc-jechac, narzednik-zawod-z, biernik-rzeczownik, ceny-zloty, biernik-przymiotnik, grzecznosc-chcialbym]
    core: []
    chunks: []
    comm: ["Rola: «trudny sprzedawca» — 5 zakupów z listy.", "Wyjaśnij drogę z dworca do domu."]
    write: "Wiadomość do znajomego: jak dojechać i co kupić po drodze."
    traps: []
    can_do: [A1-M3-S1, A1-M3-W1, A1-M3-G1, A1-M3-G2]

  # ---------- M4 · Jedzenie i dom ----------
  - n: 26
    cid: "4.1"
    slug: sniadanie
    kind: lesson
    title: "Co jesz na śniadanie?"
    story: "Marek, kucharz, pyta Olenę, co je, i śmieje się z jej śniadań."
    new: [jesc-pic]
    rec: [biernik-rzeczownik, koniugacja-am-asz, godzina]
    core: [śniadanie, obiad, kolacja, zupa, mięso, ryba, warzywa, owoce, jeść, pić, głodny, smaczny]
    chunks: ["Na śniadanie jem…", "Smacznego!"]
    comm: ["Opowiedz, co jesz w ciągu dnia.", "Zaproponuj koledze obiad i zapytaj, czego nie je."]
    write: "Menu na jeden dzień."
    traps: ["✗ piję kawa → ✓ piję kawę", "jem, jesz, je — nieregularne", "obiad = обід (о 14–16), kolacja = вечеря"]
  - n: 27
    cid: "4.2"
    slug: restauracja
    kind: lesson
    title: "W restauracji"
    story: "Olena i Kasia jedzą w restauracji, w której pracuje Marek."
    new: [dopelniacz-ilosc]
    rec: [biernik-rzeczownik, grzecznosc-chcialbym, ceny-zloty]
    core: [menu, kelner, rachunek, danie, deser, napój, szklanka, butelka, bez, stolik, rezerwacja]
    chunks: ["Dla mnie…", "Poproszę rachunek.", "z mlekiem"]
    comm: ["Zamów obiad dla dwóch osób.", "Zarezerwuj stolik przez telefon."]
    write: "SMS z rezerwacją stolika."
    traps: ["✗ bez cukier → ✓ bez cukru", "✗ szklanka woda → ✓ szklanka wody", "«рахунок» у ресторані → rachunek"]
  - n: 28
    cid: "4.3"
    slug: nie-ma
    kind: lesson
    title: "Nie ma…"
    story: "Taras przyjeżdża na weekend i otwiera pustą lodówkę Oleny."
    new: [dopelniacz-nie-ma, przeczenie-dopelniacz]
    rec: [dopelniacz-ilosc, biernik-rzeczownik, lubic-podobac]
    core: [lodówka, zakupy, lista, nic, jeszcze, już, trochę, dużo, mało, brakuje, pusty]
    chunks: ["Nie ma mleka.", "Nic nie ma."]
    comm: ["Sprawdź z bratem, czego brakuje w lodówce.", "W sklepie nie ma produktu — zapytaj o inny."]
    write: "Notatka: «Nie ma chleba, kup proszę…»"
    traps: ["✗ nie lubię kawę → ✓ nie lubię kawy", "✗ nie ma mleko → ✓ nie ma mleka", "✗ nie mam chleb → ✓ nie mam chleba"]
  - n: 29
    cid: "4.4"
    slug: mieszkanie
    kind: lesson
    title: "Moje mieszkanie"
    story: "Olena pokazuje mamie mieszkanie przez wideorozmowę."
    new: [liczba-mnoga-mianownik]
    rec: [miejscownik-miejsce, przymiotnik-mianownik, dopelniacz-nie-ma]
    core: [pokój, kuchnia, łazienka, sypialnia, balkon, okno, stół, krzesło, szafa, łóżko, dywan, kanapa]
    chunks: ["W kuchni jest…", "Na stole są…"]
    comm: ["Oprowadź kogoś po swoim mieszkaniu.", "Opisz swój wymarzony pokój."]
    write: "Opis mieszkania do ogłoszenia."
    traps: ["dywan = килим, nie диван", "✗ pokoji → ✓ pokoje", "✗ na kuchni → ✓ w kuchni"]
  - n: 30
    cid: "4.5"
    slug: wynajem
    kind: lesson
    title: "Wynajmuję mieszkanie"
    story: "Taras szuka mieszkania we Wrocławiu; Olena pomaga mu dzwonić do właścicieli."
    new: [liczebnik-rzeczownik]
    rec: [liczba-mnoga-mianownik, ceny-zloty, pan-pani, dopelniacz-nie-ma]
    core: [wynająć, właściciel, czynsz, opłaty, kaucja, piętro, winda, metr, umeblowany, oglądać]
    chunks: ["Dzwonię w sprawie ogłoszenia.", "Czy mieszkanie jest jeszcze aktualne?"]
    comm: ["Zadzwoń do właściciela: 5 pytań o mieszkanie.", "Umów się na oglądanie."]
    write: "E-mail z pytaniami o mieszkanie."
    traps: ["dwa pokoje, ale pięć pokoi", "✗ pięć pokoje → ✓ pięć pokoi", "kaucja = застава, депозит"]
    note: "Тут 2–4 / 5+ стає правилом; зразки з 22 (dwa kilo, pięć jajek) повертаються як приклади."
  - n: 31
    cid: "4.6"
    slug: powtorka-m4
    kind: review
    title: "Powtórka: jedzenie i dom"
    story: "Parapetówka u Oleny: goście, jedzenie, pusta lodówka o północy."
    new: []
    rec: [jesc-pic, dopelniacz-ilosc, dopelniacz-nie-ma, przeczenie-dopelniacz, liczba-mnoga-mianownik, liczebnik-rzeczownik, biernik-rzeczownik]
    core: []
    chunks: []
    comm: ["Zaplanuj z partnerem parapetówkę: menu i zakupy.", "Goście pytają o mieszkanie — oprowadź ich."]
    write: "Popraw notatkę z lekcji 28 i ogłoszenie z lekcji 29."
    traps: []
  - n: 32
    cid: "4.7"
    slug: kontrolna-m4
    kind: checkpoint
    title: "Kontrolna: jedzenie i dom"
    story: "Kasia szuka mieszkania i zaprasza Olenę na kolację."
    new: []
    rec: [jesc-pic, dopelniacz-ilosc, dopelniacz-nie-ma, przeczenie-dopelniacz, liczba-mnoga-mianownik, liczebnik-rzeczownik, biernik-rzeczownik]
    core: []
    chunks: []
    comm: ["Rola: restauracja.", "Rola: telefon do właściciela, 5 pytań."]
    write: "Notatka + ogłoszenie o mieszkaniu."
    traps: []
    can_do: [A1-M4-S1, A1-M4-W1, A1-M4-G1, A1-M4-G2]

  # ---------- M5 · Wczoraj i jutro ----------
  - n: 33
    cid: "5.1"
    slug: wczoraj
    kind: lesson
    title: "Co robiłaś wczoraj?"
    story: "Poniedziałek w biurze: Kasia pyta Olenę o weekend."
    new: [czas-przeszly]
    rec: [koniugacja-am-asz, godzina, biernik-rzeczownik]
    core: [wczoraj, przedwczoraj, weekend, sobota, niedziela, sprzątać, oglądać, odpocząć, najpierw, potem, na końcu]
    chunks: ["W sobotę byłam w…", "Co robiłeś wczoraj?"]
    comm: ["Opowiedz o wczorajszym dniu.", "Zapytaj partnera o weekend i dopytaj o szczegóły."]
    write: "Wpis w dzienniku: wczoraj."
    traps: ["✗ ja robił → ✓ robiłem / robiłam", "✗ ona robił → ✓ ona robiła", "«я була» → ✓ byłam"]
  - n: 34
    cid: "5.2"
    slug: bylam-poszlam
    kind: lesson
    title: "Byłam, miałam, poszłam"
    story: "Olena jedzie z Kasią w Tatry i gubi się na szlaku."
    new: [czas-przeszly-nieregularny]
    rec: [czas-przeszly, isc-jechac, miejscownik-miejsce]
    core: [góry, wycieczka, szlak, schronisko, widok, zmęczony, piękny, wrócić, zgubić się, pojechać, zdjęcie]
    chunks: ["Poszłam w góry.", "Pojechałyśmy pociągiem."]
    comm: ["Opowiedz o wycieczce z problemem.", "Zapytaj znajomego o jego ostatnią podróż."]
    write: "Pocztówka z gór do Tarasa."
    traps: ["✗ iszłam → ✓ szłam / poszłam", "jadłem, ale jadłam", "✗ ja poszłem → ✓ poszedłem (on), poszłam (ona)"]
  - n: 35
    cid: "5.3"
    slug: bedziesz
    kind: lesson
    title: "Co będziesz robić?"
    story: "Olena planuje urlop: mama ma przyjechać do Krakowa."
    new: [czas-przyszly-bede]
    rec: [czas-przeszly, modalne-bezokolicznik, godzina]
    core: [jutro, pojutrze, w przyszłym tygodniu, urlop, plan, odwiedzić, zwiedzać, może, na pewno, przyjechać]
    chunks: ["W przyszłym tygodniu będę…", "Na pewno!", "Idę do kina."]
    comm: ["Opowiedz o planach na urlop.", "Zaplanuj z partnerem wspólny weekend."]
    write: "Plan weekendu: 6 zdań."
    traps: ["✗ będę robię → ✓ będę robić", "будуть робити → będą robić", "✗ jutro ja idę w kino → ✓ jutro idę do kina (chunk)"]
  - n: 36
    cid: "5.4"
    slug: czas-wolny
    kind: lesson
    title: "Czas wolny"
    story: "Olena zapisuje się na zajęcia: joga z Kasią i gitara z Markiem."
    new: [narzednik-zawod-z, grac-w-na]
    rec: [czas-przyszly-bede, lubic-podobac, koniugacja-e-esz]
    core: [hobby, grać, piłka, gitara, basen, siłownia, zajęcia, zapisać się, trener, przyjaciel, razem]
    chunks: ["Gram w tenisa.", "Chodzę na basen."]
    comm: ["Zapisz się na zajęcia: dni, godziny, cena.", "Zaproś kogoś na wspólny sport."]
    write: "Zaproszenie na wydarzenie."
    traps: ["grać w piłkę, ale grać na gitarze", "✗ z mama → ✓ z mamą", "chodzę na basen (регулярно), idę na basen (зараз)"]
  - n: 37
    cid: "5.5"
    slug: umawiamy-sie
    kind: lesson
    title: "Umawiamy się"
    story: "Urodziny Kasi: zaproszenie, prezent, zmiana terminu."
    new: [data-podstawowa]
    rec: [czas-przyszly-bede, czas-przeszly, modalne-bezokolicznik, godzina]
    core: [urodziny, impreza, zaproszenie, prezent, termin, chętnie, niestety, styczeń, maj, grudzień, zgoda]
    chunks: ["Kiedy masz urodziny?", "Piątego maja."]
    comm: ["Zaproś na urodziny — podaj datę i godzinę.", "Odmów i zaproponuj inny termin."]
    write: "Odpowiedź na zaproszenie: odmowa + nowy termin."
    traps: ["✗ piąty maja (kiedy?) → ✓ piątego maja", "miesiące małą literą", "✗ w maj → ✓ w maju"]
  - n: 38
    cid: "5.6"
    slug: powtorka-m5
    kind: review
    title: "Powtórka: wczoraj i jutro"
    story: "Pamiętnik Oleny: pierwszy miesiąc w Krakowie i plany na następny."
    new: []
    rec: [czas-przeszly, czas-przeszly-nieregularny, czas-przyszly-bede, narzednik-zawod-z, grac-w-na, data-podstawowa]
    core: []
    chunks: []
    comm: ["Opowieść w łańcuchu: każdy dodaje jedno zdanie o przeszłości albo przyszłości.", "Ustal z partnerem trzy daty spotkań w przyszłym miesiącu."]
    write: "Popraw pocztówkę z lekcji 34 i dopisz plany."
    traps: []
  - n: 39
    cid: "5.7"
    slug: kontrolna-m5
    kind: checkpoint
    title: "Kontrolna: wczoraj i jutro"
    story: "Taras pyta Olenę o jej miesiąc i plany na święta."
    new: []
    rec: [czas-przeszly, czas-przeszly-nieregularny, czas-przyszly-bede, narzednik-zawod-z, grac-w-na, data-podstawowa]
    core: []
    chunks: []
    comm: ["Monolog 2 min: weekend i plany.", "Rozmowa: umów się na konkretną datę."]
    write: "E-mail o weekendzie, 60–70 słów."
    traps: []
    can_do: [A1-M5-S1, A1-M5-W1, A1-M5-G1]

  # ---------- M6 · Sprawy praktyczne ----------
  - n: 40
    cid: "6.1"
    slug: u-lekarza
    kind: lesson
    title: "U lekarza"
    story: "Olena choruje: dzwoni do przychodni i pisze do pana Adama."
    new: [boli-mnie]
    rec: [czas-przeszly, data-podstawowa, godzina, pan-pani]
    core: [przychodnia, gorączka, kaszel, katar, ból, głowa, gardło, brzuch, recepta, zwolnienie, chory]
    chunks: ["Źle się czuję.", "Mam gorączkę."]
    comm: ["Umów wizytę i opisz objawy.", "Opowiedz lekarzowi, od kiedy boli."]
    write: "SMS do szefa: «Jestem chora…»"
    traps: ["«у мене болить голова» → ✓ boli mnie głowa", "✗ u mnie boli → ✓ boli mnie", "zwolnienie = лікарняний"]
  - n: 41
    cid: "6.2"
    slug: w-urzedzie
    kind: lesson
    title: "W urzędzie"
    story: "Olena składa wniosek w urzędzie i czeka w kolejce z numerkiem."
    new: [potrzebowac-dopelniacz]
    rec: [dopelniacz-nie-ma, data-podstawowa, liczebniki-glowne, grzecznosc-chcialbym]
    core: [urząd, wniosek, dokument, paszport, podpis, okienko, numerek, kolejka, zaświadczenie, termin, wypełnić]
    chunks: ["Potrzebuję zaświadczenia.", "Gdzie mam się podpisać?"]
    comm: ["Zapytaj w okienku, jakie dokumenty są potrzebne.", "Brakuje ci dokumentu — poproś o nowy termin."]
    write: "Formularz w urzędzie."
    traps: ["urząd ≠ «уряд» (= rząd)", "✗ potrzebuję zaświadczenie → ✓ zaświadczenia", "okienko = віконце, а не вікно"]
  - n: 42
    cid: "6.3"
    slug: przez-telefon
    kind: lesson
    title: "Przez telefon"
    story: "Olenie nie działa internet — dzwoni na infolinię i do Marka po pomoc."
    new: [rozkaznik-podstawowy]
    rec: [grzecznosc-chcialbym, czas-przyszly-bede, pan-pani]
    core: [dzwonić, zadzwonić, oddzwonić, poczekać, powtórzyć, przeliterować, połączenie, sprawa, słabo słychać, infolinia]
    chunks: ["Dzwonię w sprawie…", "Proszę powtórzyć."]
    comm: ["Zadzwoń na infolinię i zgłoś problem.", "Poproś znajomego: «Zadzwoń do mnie za godzinę»."]
    write: "Notatka z rozmowy: kto, co, kiedy."
    traps: ["✗ nie rozumiem polski → ✓ nie rozumiem po polsku", "zadzwoń (ty) vs. proszę zadzwonić (Pan/Pani)", "«передзвоніть» → ✓ proszę oddzwonić"]
  - n: 43
    cid: "6.4"
    slug: pogoda
    kind: lesson
    title: "Pogoda i pory roku"
    story: "Mama Oleny pyta, co zabrać do Krakowa w listopadzie."
    new: [pogoda-pory-roku]
    rec: [czas-przyszly-bede, data-podstawowa, isc-jechac]
    core: [pogoda, słońce, deszcz, śnieg, wiatr, ciepło, zimno, wiosna, lato, jesień, zima, parasol]
    chunks: ["Jest zimno.", "Pada deszcz."]
    comm: ["Doradź komuś, co zabrać na wyjazd.", "Porozmawiaj o ulubionej porze roku."]
    write: "Wiadomość do mamy przed przyjazdem."
    traps: ["latem, zimą (bez przyimka); w lecie też można", "«іде дощ» → ✓ pada deszcz", "✗ jest zimny → ✓ jest zimno (о погоді)"]
  - n: 44
    cid: "6.5"
    slug: moj-krakow
    kind: lesson
    title: "Mój nowy dom"
    story: "Rok później: Olena porównuje, jak było na początku, jak jest teraz i co będzie dalej."
    new: []
    rec: [czas-przeszly, czas-przyszly-bede, koniugacja-am-asz, miejscownik-miejsce]
    core: [na początku, teraz, kiedyś, dalej, przyzwyczaić się, tęsknić, dom, marzenie, nadzieja, zmiana]
    chunks: ["Na początku było trudno.", "Teraz czuję się jak w domu."]
    comm: ["Opowiedz: jak było, jak jest, jak będzie.", "Zapytaj partnera o jego największą zmianę."]
    write: "E-mail do przyjaciela: rok w nowym miejscu, 60 słów."
    traps: ["tęsknię za domem (+ narzędnik, chunk)", "✗ ja przywykłam → ✓ przyzwyczaiłam się", "«тепер» → teraz"]
    integration: true
    note: "Інтеграційний урок без нової граматики: три часи в одному тексті. Не review — має свої core-слова."
  - n: 45
    cid: "6.6"
    slug: powtorka-generalna
    kind: review
    title: "Powtórka generalna"
    story: "Olena pomaga nowej koleżance z Ukrainy — powtarza z nią wszystko od początku."
    new: []
    rec: [biernik-rzeczownik, miejscownik-miejsce, dopelniacz-nie-ma, czas-przeszly, czas-przyszly-bede, pan-pani, koniugacja-e-isz]
    core: []
    chunks: []
    comm: ["Rola: pierwszy dzień nowej osoby w Polsce.", "Speaking marathon: 6 tematów po 1 minucie."]
    write: "Przepisz najsłabszy tekst z kursu (według danych)."
    traps: []
    note: "Персональний: блок вправ береться з get_review_items для кожного учня. У JSON — лише спільна частина."
  - n: 46
    cid: "6.7"
    slug: egzamin-a1
    kind: exam
    title: "Egzamin A1"
    story: "—"
    new: []
    rec: [biernik-rzeczownik, miejscownik-miejsce, dopelniacz-nie-ma, czas-przeszly, czas-przyszly-bede, pan-pani, koniugacja-e-isz]
    core: []
    chunks: []
    comm: ["Monolog 3 min («Głos po»).", "Rola: sprawa praktyczna (lekarz / urząd / telefon)."]
    write: "E-mail na 60–80 słów, 4 punkty."
    traps: []
    can_do: [A1-M6-S1, A1-M6-W1, A1-M6-G1]
```

---

## 8. Черга виробництва

| Черга | Уроки | Чому |
|---|---|---|
| 1 | 03, 04 | закривають модуль 0 — повний A0-блок під пробний і перший платний урок |
| 2 | 05–07 | старт модуля 1 з «Głos przed» і дієвідміною |
| 3 | 08–11 | решта M1 + повторення й контрольна |
| далі | 12–46 | у порядку номерів |

Урок «Wczoraj o siódmej» (`pl-a1-01-wczoraj`) лишається поза нумерацією; коли дійдемо до 13 і 33, його матеріал можна переробити за правилами ♻️ з `CURRICULUM_A2.md`, розділ 5.
