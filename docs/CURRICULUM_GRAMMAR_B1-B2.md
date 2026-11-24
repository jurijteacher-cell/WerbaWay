# Werba Way — карта курсу «Граматика B1 → B2»

Модуль: `pl-gram-b2` · формат: індивідуально · id уроків: `pl-gram-b2-{n:02}-{slug}`
Принцип: **вивчення через граматику**. Граматика — хребет уроку (≥50% часу), читання, слова й говоріння працюють на цільову конструкцію, а не навпаки.
Учень: вільно говорить, але граматика не систематизована. Тому блок 1 — повне повторення B1 як системи (мапа → форми → вживання), далі B2.

Теги `grammar_point` — лише з `GRAMMAR_REGISTRY.md` (рівні B1 і B2).

> v4: подача граматики — за циклом «порція → вправи → винятки → вправи → пастка → … → збірні» (`GRAMMAR_METHOD.md`). Розділ 1–2 нижче — історичний шаблон слайдів; кількісні норми пасток там застаріли (немає квоти, лише справжні пастки).

**v1.1 (2026-11-16)** — після аудиту сходинки три теги перейменовано або злито, щоб одна назва не означала двох речей:
- `liczebniki-glowne` в уроці 28 → **`liczebniki-odmiana`** (назва `liczebniki-glowne` зайнята кількісними числівниками A0);
- `celownik-sie` (урок 36) злито з **`celownik-bezosobowe`** (A2-67) — це одне й те саме;
- `czas-przyszly` (урок 6) → **`czas-przyszly-bede`** (A1) + **`czas-przyszly-dk`** (A2), залежно від блоку;
- `wolacz` більше не вводиться тут: він стоїть на A1 (урок 09), в уроці 1 лише повторюється;
- `stopniowanie` і `porownania` — спільні теги з A2 (урок 34 їх поглиблює, не дублює).

Готові уроки своїх JSON не змінюють — старі назви тегів розв'язує `course_grammar_aliases`.

## 1. Формат граматичного уроку (`kind: grammar`)

Відрізняється від стандартного `lesson` з LESSON_PROTOCOL: граматика йде першою, Opis zdjęć немає, словник менший.

| № | Розділ | Що всередині | Хв (з 180) |
|---|---|---|---|
| — | **Cele lekcji** | 3–4 цілі «Po tej lekcji potrafisz…» 🎯 | — |
| 1 | **Na start** | розминка (питання + слово) і блок `g0` «Sprawdź, co już wiesz»: 5 речень `fill-in-blank` на тему уроку, без оцінки | 10 |
| 2 | **Gramatyka, część 1** | `[SLIDES part="1"]` + блоки вправ до її слайдів | 45 |
| 3 | **Gramatyka, część 2** | `[SLIDES part="2"]` → теорія → винятки → пастки + решта блоків | 45 |
| 4 | **Czytanie** | оригінальний текст, цільова граматика ≥10 разів, `[AUDIO text="section:4"]`; блок `e1` + блок «Polowanie na formy» (`matching` в `grammar.json`, останній блок: форма з тексту ↔ відмінок / правило) | 25 |
| 5 | **Słownictwo** | `vocab-cards`, 20–25 слів, 3–4 групи: одна — колокації з відмінком / словотвір цільової граматики, по одній — для кожної комунікаційної задачі | 15 |
| 6 | **Mówienie przez gramatykę** | 5–6 питань, кожне вимагає цільової конструкції (підказка конструкції в дужках) + 2 `flip-task`, перша з `model_dialogue` 10–14 реплік і `e2` | 30 |
| 7 | **Podsumowanie** | по пункту на кожну ціль + повернення до слова з розминки | 10 |
| 8 | **Praca domowa** | `hw.json` (≥6 блоків, інші контексти) + перевірені відео/стаття + письмо з ≥6 вживаннями цільової граматики, які учень сам підкреслює | — |
| — | **Słowniczek** | окрема сторінка | — |

Файли: `{id}.md` · `-slides.json` · `-grammar.json` · `-vocab.json` · `-comm-tasks.json` · `-exam.json` · `-hw.json` · `-teacher.md`. **Без `-pictures.json`.**
Заняття: 2 × 90 хв (або 3 × 60). Frontmatter: `kind: grammar`, `new`, `rec` — з рядка карти.

## 2. Параметри рівня (B1+ / B2 — доповнення до таблиці LESSON_PROTOCOL)

| | Блоки 1–2 (B1+) | Блоки 3–6 (B2) |
|---|---|---|
| Текст Czytanie | 400–500 слів | 500–600 слів |
| Цільова граматика в тексті | ≥10 | ≥12 |
| Словник | 20–25, 3–4 групи | 20–25, 3–4 групи |
| Слайди теорії (без титульного) | 12–14 | 12–16 |
| Слайди винятків · пасток | 1–2 · 1–2 (5–6 пасток) | 1–2 · 1–2 (5–6 пасток) |
| Граматичні блоки (з `g0`, без «Polowania») | 8–10 | 9–11 |
| Комунікаційні задачі | 2 | 2 |
| Блоки «jak na egzaminie» | e1 + e2 | e1 + e2 |
| Письмо (ДЗ) | 150–180 слів | 180–220 слів |

Правила слайдів — без змін з v3.4: повністю заповнені, одна думка на слайд, таблиці ≤6×6, ≤20 слів поза таблицями, ≤6 виділень `[[...]]`, `teacher_note` українською, винятки окремо з `refers_to`.

## 3. Карта уроків

| n | slug | Граматика (`new`) | Повторює (`rec`) | Тема читання | Фокус пасток з української |
|---|---|---|---|---|---|
| **Блок 1 — Систематизація B1** |||||
| 1 | przypadki | `przypadki-funkcje`, `przypadki-przyimki`, `rzecz-lp-meski`, `rzecz-lp-zenski`, `rzecz-lp-nijaki` | `wolacz` (з A1) | Rok we Wrocławiu | *шукаю роботу* → szukam pracy; *я лікар* → jestem lekarzem |
| 2 | przymiotniki | `przym-lp`, `zaimki-przym` | `rzecz-lp-*`, `przypadki-przyimki` | Rzeczy z historią: pchli targ | *з моїм братом* → z moim bratem; *свій* → swój |
| 3 | zawody | `mn-mianownik-mos` | `przym-lp`, `rzecz-lp-*` | Zawody przyszłości | *студенти прийшли* → studenci przyszli; *ці люди* → ci ludzie |
| 4 | miasta | `mn-przypadki`, `rzecz-nieregularne` | `mn-mianownik-mos`, `przym-lp` | Miasta dla ludzi, nie dla samochodów | *з людьми* → z ludźmi; *грошей* → pieniędzy |
| 5 | poranki | `koniugacje`, `czasowniki-nieregularne` | `mn-*` | Poranki w różnych zawodach | *вони їдять* → jedzą; *я можу* → mogę |
| 6 | dziecinstwo | `czas-przeszly`, `czas-przyszly-bede`, `czas-przyszly-dk` | `koniugacje`, `mn-przypadki` | Dzieciństwo bez smartfona | *ми ходили* → chodziliśmy; *буду робити* → będę robić / robił |
| 7 | nawyki | `aspekt-tworzenie`, `aspekt-uzycie` | `czas-*`, `koniugacje` | Nawyki: jak zacząć i nie przestać | *брати/взяти* → brać/wziąć; *почав писати* → zaczął pisać (ndk) |
| 8 | podroze | `ruch-przedrostki`, `ruch-iterat` | `aspekt-*`, `czas-*` | Podróże bez samolotu | *їхати на роботу* → jechać do pracy |
| 9 | przyjazn | `zaimki-formy`, `enklityki-zaimki` | `ruch-*`, `aspekt-*` | Przyjaźń na odległość | *для нього* → dla niego, але *його книжка* → jego książka |
| 10 | powtorka-1 | — (`review`) | теги уроків 1–9 | новий текст блоку | — |
| **Блок 2 — Складне речення і логіка тексту** |||||
| 11 | miejsca | `ktory-przypadki`, `wzgledne-inne` | `zaimki-*`, `ruch-*` | Miejsca, które warto zobaczyć | *все, що* → wszystko, co; *той, який* → ten, który |
| 12 | migracje | `przyczyna-skutek`, `przyimki-przyczyny` | `ktory-*`, `zaimki-*` | Dlaczego młodzi wyjeżdżają ze wsi? | *тому що* → bo / ponieważ; *gdyż/bowiem* — позиція |
| 13 | praca-zdalna | `przyzwolenie`, `przeciwstawienie` | `przyczyna-*`, `ktory-*` | Praca zdalna — za i przeciw | *незважаючи на дощ* → mimo deszczu (✗ mimo na) |
| 14 | szkola | `zeby-cel`, `zeby-zyczenie`, `niech` | `przyzwolenie`, `przyczyna-*` | Szkoła przyszłości | *щоб не запізнитися* → żeby się nie spóźnić |
| 15 | wywiad | `mowa-zalezna`, `pytania-zalezne` | `zeby-*`, `przyzwolenie` | Co mówią eksperci o śnie | *спитати у нього* → zapytać go |
| 16 | powtorka-2 | — (`review`) | теги уроків 11–15 | новий текст блоку | — |
| **Блок 3 — Способи дієслова і модальність** |||||
| 17 | marzenia | `przypuszczajacy-formy`, `by-ruchome` | `mowa-zalezna`, `zeby-*` | Wymarzone miejsce do życia | *я б зробив* → zrobiłbym; *якби я знав* → gdybym wiedział |
| 18 | historia-alternatywna | `warunek-realny`, `warunek-nierealny` | `przypuszczajacy-*`, `mowa-zalezna` | Co by było, gdyby… | *якщо б* → gdyby (✗ jeśliby) |
| 19 | przepisy | `modalne` | `warunek-*`, `przypuszczajacy-*` | Co wolno, a czego nie wolno | *я маю зробити* ≠ mam zrobić; *не треба* vs nie wolno |
| 20 | rozmowa-kwalifikacyjna | `rozkazujacy`, `rozkazujacy-aspekt` | `modalne`, `warunek-*` | Jak przygotować się do rozmowy o pracę | *давай підемо* → chodźmy; *не роби!* → nie rób (ndk) |
| 21 | powtorka-3 | — (`review`) | теги уроків 17–20 | новий текст блоку | — |
| **Блок 4 — Формальний і безособовий стиль** |||||
| 22 | odbudowa | `bierna-byc-zostac`, `bierna-czasy` | `rozkazujacy-*`, `modalne` | Odbudowa Warszawy | *був збудований* → został (процес) vs był (стан) |
| 23 | zwyczaje | `bezosobowe-no-to`, `bezosobowe-sie` | `bierna-*`, `rozkazujacy-*` | Przy polskim stole: co się robi | *кажуть* → mówi się / mówią; *заборонено* → zabrania się |
| 24 | nauka | `imieslow-czynny`, `imieslow-bierny` | `bezosobowe-*`, `bierna-*` | Odkrycia, które zmieniają medycynę | укр. уникає *-учий*, польська вживає -ący вільно |
| 25 | wyprawa | `imieslow-ac`, `imieslow-wszy` | `imieslow-czynny/bierny`, `bezosobowe-*` | Relacja z wyprawy | спільний підмет: ✗ *Wchodząc do domu, zaczął padać deszcz* |
| 26 | regulaminy | `odczasownikowe` | `imieslow-*` | Jak czytać język urzędowy | *навчання* → uczenie się (się лишається) |
| 27 | powtorka-4 | — (`review`) | теги уроків 22–26 | новий текст блоку | — |
| **Блок 5 — Точність: числівники, прийменники, керування** |||||
| 28 | statystyki | `liczebniki-odmiana`, `liczebniki-skladnia` | `odczasownikowe`, `imieslow-*` | Polska w liczbach | *п'ять студентів прийшли* → pięciu studentów przyszło |
| 29 | rodzina | `liczebniki-zbiorowe`, `liczebniki-daty` | `liczebniki-odmiana/skladnia`, `odczasownikowe` | Rodzina dawniej i dziś | *обидва* → obaj / obie / oboje |
| 30 | komunikaty | `przyimki-zlozone` | `liczebniki-*` | Komunikaty i ogłoszenia | *на протязі* → w ciągu (✗ na przeciągu) |
| 31 | firma | `rekcja` | `przyimki-zlozone`, `liczebniki-zbiorowe` | Pierwszy tydzień w polskiej firmie | *думати про* → myśleć o; *мені залежить* → zależy mi na |
| 32 | powtorka-5 | — (`review`) | теги уроків 28–31 | новий текст блоку | — |
| **Блок 6 — Нюанс і природність** |||||
| 33 | zagadka | `zaimki-nieokreslone`, `negacja-podwojna` | `rekcja`, `przyimki-zlozone` | Mini-kryminał | *будь-хто* → ktokolwiek / byle kto |
| 34 | miasto-czy-wies | `stopniowanie`, `porownania` | `zaimki-nieokreslone`, `rekcja` | Miasto czy wieś? | *чим…тим* → im…tym; *більш цікавий* → ciekawszy |
| 35 | nowe-slowa | `slowotworstwo` | `stopniowanie`, `zaimki-nieokreslone` | Nowe słowa w polszczyźnie | суфікси-«двійники» (-ість ↔ -ość, але не завжди) |
| 36 | pech | `sie-znaczenia`, `celownik-bezosobowe` | `slowotworstwo`, `porownania` | Dzień, w którym wszystko się psuło | *мені подобається* → podoba mi się; *хочеться* → chce mi się |
| 37 | felieton | `szyk`, `partykuly` | `sie-*`, `slowotworstwo` | Felieton: styl i opinia | *я вже його бачив* → już go widziałem (позиція енклітики) |
| 38 | powtorka-6 | — (`review`) | теги уроків 33–37 | новий текст блоку | — |
| 39 | egzamin | — (`exam`, фінальний тест граматики B2) | усі теги курсу | — | — |

## 4. Теги

Канон і мапінг — `GRAMMAR_REGISTRY.md` + таблиці `course_grammar_points` / `course_grammar_aliases` у Supabase. Нові теги в уроках не вигадуються: якщо теми в каноні немає, вона спершу додається туди. Службові теги `kalki-uk` і `slownictwo` — як скрізь.

## 5. Правила зв'язку уроків

- **`rec` у карті — обов'язковий мінімум:** кожен тег з `rec` отримує ≥1 блок вправ або ≥3 завдання в інших блоках, і ≥2 вживання в тексті читання.
- **Дозволена граматика:** учень вільно говорить, тому текст і діалог можуть вільно вживати все ядро B1. Слайди й вправи перевіряють лише теги уроків 1…N; пізніші теги в них — тільки як природне тло, ніколи як предмет завдання.
- **Слова:** ≥6 слів зі словників двох попередніх уроків у тексті, діалозі або вправах, запис у `recycles`.
- **Review (уроки 10, 16, 21, 27, 32, 38):** за правилами `review` з LESSON_PROTOCOL; презентація «Mapa bloku» — по слайду на тег блоку.
- **Пастки:** колонка карти — орієнтир, а не квота: у урок потрапляють лише ті, що пройшли три тести з `GRAMMAR_METHOD.md` §3.

## 6. Як працює повторення B1 (блок 1)

Окремої діагностики немає: роль діагностики виконує `g0` кожного уроку.
- `g0` ≥4/5 — слайди йдуть швидким темпом (викладач відкриває таблиці цілими, `reveal: all`), час переходить на блоки 4–8 піраміди й говоріння.
- `g0` ≤2/5 — повний покроковий показ, домашка посилюється блоками за найслабшими тегами.
- Урок 10 (review) закінчується міні-тестом на 20 завдань (формат `test.json`, блок `t1`) — перевірка, чи можна переходити до B2.

## 7. Обсяг

39 уроків × 180 хв ≈ 117 год контакту. Темп 1 урок / тиждень (2 заняття) ≈ 9–10 місяців; блок 1 ≈ 10 тижнів.
