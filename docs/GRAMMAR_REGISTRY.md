# Werba Way — канонічний реєстр граматичних тегів (A0 → B2)

**Єдине джерело істини для `grammar_point`.** Карти курсів більше не тримають власних реєстрів — вони лише посилаються сюди.
Статус: **v1.0, 2026-11-16.** Машинна копія для перевірок — `docs/grammar-registry.json`, перевірка — `scripts/check_tags.py`.

## 1. Навіщо

`grammar_point` у кожному завданні — це те, на чому тримається прогрес: `mastery` за тегом, can-do модуля, персональна повторка (`get_review_items`). Тег рахується лише тоді, коли він закріплений **щонайменше у двох уроках**.

Аудит 2026-11-16 показав: у 476 опублікованих файлах вправ стоїть **497 різних тегів** замість закритого реєстру на ~130. Більшість трапляється в одному уроці, тобто mastery не рахувався **ніколи й на жодному рівні**. Причина — правило «теги не вигадуються» ніде не перевірялося автоматично.

Рішення:
1. Канон (розділ 3) — закритий список, який живе у `course_grammar_points` у Supabase.
2. Мапінг (розділ 4) — таблиця `course_grammar_aliases`: кожен із 497 реальних тегів вказує на канонічний. Старі спроби не переписуються, вони читаються через `v_attempts_canon`.
3. Перевірка (розділ 5) — жоден новий урок не публікується з тегом поза каноном і мапінгом.

## 2. Правила

- Новий урок бере `grammar_point` **лише** з розділу 3. Варіації («-formy», «-koncowki», «-popraw», «-wyjatki») не створюються: деталізація йде в `block_id` і `explanation`, не в тег.
- Якщо теми справді немає — тег спершу додається сюди, у `docs/grammar-registry.json` і в `course_grammar_points`, і лише потім з'являється в уроці.
- Один тег = одне значення. Колізії, які вже були, розв'язані так:
  - `liczebniki-glowne` — лише кількісні числівники A0. Відмінювання 1–1000 з `pl-gram-b2-28` отримало окремий тег `liczebniki-odmiana`.
  - `celownik-sie` (gram-b2) злито з `celownik-bezosobowe` (A2): це одне й те саме (*podoba mi się, chce mi się*).
  - `czas-przyszly` (gram-b2) злито з `czas-przyszly-bede` (A1); доконаний майбутній — окремий `czas-przyszly-dk` (A2).
  - `wolacz` переїхав з gram-b2 на A1 (урок 09): звертання вживаються з уроку 03, їх треба пояснити там, а не на B2.
  - `stopniowanie` і `porownania` — єдині теги A2; gram-b2 їх повторює, не дублює.
- Пари «основи → повністю» лишаються різними тегами навмисно, бо на них висять різні can-do:
  `rozkaznik-podstawowy` (A1) → `rozkaznik-pelny` (A2) → `rozkazujacy` (B1);
  `miejscownik-miejsce` → `miejscownik-pelny`; `mowa-zalezna-podstawy` (A2) → `mowa-zalezna` (B1);
  `ktory-podstawy` (A2) → `ktory-przypadki` (B1); `isc-jechac` (A1) → `isc-jechac-przedrostki` (A2) → `ruch-przedrostki` (B1).
- Службові теги (`slownictwo`, `kalki-uk`, `kalki-ru`, `kalki-en`, `czytanie`, `sluchanie`, `powtorka`) не мають рівня й **не входять у mastery** — вони лише маркують тип завдання.

## 3. Канон

### Службові
`slownictwo` · `kalki-uk` · `kalki-ru` · `kalki-en` · `czytanie` · `sluchanie` · `powtorka`

### A0
| Тег | Що покриває |
|---|---|
| `wymowa-glosek` | звуки й диграфи |
| `akcent` | наголос |
| `pisownia` | ą/ę, rz/ż, ó/u, ch/h, велика літера, разом/окремо |
| `byc` | być у теперішньому |
| `pan-pani` | Pan / Pani + 3 особа |
| `miec` | mieć |
| `liczebniki-glowne` | кількісні числівники |

### A1
| Тег | Що покриває |
|---|---|
| `pytajniki` | kto, co, gdzie, skąd, czy, ile |
| `rodzaj-rzeczownika` | рід іменника, винятки, форми професій |
| `narzednik-zawod-z` | jestem lekarzem, z kim, czym |
| `zaimek-dzierzawczy` | mój, twój, swój |
| `przymiotnik-mianownik` | прикметник у називному, узгодження |
| `koniugacja-am-asz` | -am/-asz, -em/-esz |
| `godzina` | години |
| `koniugacja-e-isz` | -ę/-isz/-ysz |
| `czasownik-sie` | дієслова з się |
| `koniugacja-e-esz` | -ę/-esz, -uję |
| `modalne-bezokolicznik` | chcieć, móc, musieć, umieć + інфінітив |
| `lubic-podobac` | lubić, podobać się, smakować |
| `miejscownik-miejsce` | w / na: де |
| `isc-jechac` | iść / jechać, пішки чи транспортом |
| `biernik-rzeczownik` | знахідний іменників, після прийменників |
| `ceny-zloty` | złoty, złote, złotych, grosz |
| `biernik-przymiotnik` | знахідний прикметників |
| `grzecznosc-chcialbym` | chciałbym, proszę + інфінітив |
| `wolacz` | Pani Ewo, Panie Adamie, Kasiu |
| `jesc-pic` | jeść / pić |
| `dopelniacz-ilosc` | bez, kilo, szklanka |
| `dopelniacz-nie-ma` | nie ma, brakuje |
| `przeczenie-dopelniacz` | biernik → dopełniacz у запереченні |
| `liczba-mnoga-mianownik` | множина в називному |
| `liczebnik-rzeczownik` | dwa pokoje, pięć pokoi, wiek |
| `czas-przeszly` | минулий час, рід |
| `czas-przeszly-nieregularny` | szedł, jadł, poszedł |
| `czas-przyszly-bede` | będę + інфінітив |
| `grac-w-na` | grać w / na, interesować się |
| `data-podstawowa` | piątego maja |
| `boli-mnie` | boli mnie |
| `potrzebowac-dopelniacz` | potrzebuję + родовий |
| `rozkaznik-podstawowy` | powtórz, zadzwoń |
| `pogoda-pory-roku` | погода й пори року |

### A2
| Тег | Що покриває |
|---|---|
| `dopelniacz-przyimki` | do, od, z, u, bez, dla, obok + дієслова з родовим |
| `celownik-osoby` | komu: dać, pomóc, powiedzieć, dziękować |
| `celownik-bezosobowe` | jest mi zimno, chce mi się, podoba mi się |
| `zaimki-osobowe-przypadki` | mnie, cię, go, ją; mi, ci, mu, jej |
| `narzednik-pelny` | орудний з прикметником; przed, nad, pod, za, między |
| `liczebniki-porzadkowe` | порядкові |
| `data-pelna` | дата з роком, od … do |
| `aspekt-podstawy` | пари dk / ndk |
| `aspekt-przeszly` | вид у минулому |
| `aspekt-uzycie` | сигнали виду, фазові дієслова *(спільний з B1)* |
| `czas-przyszly-dk` | zrobię |
| `zdania-czasowe` | kiedy, zanim, po tym jak, podczas |
| `przyimki-czasu` | w, na, za, przez, od, do, temu, po, przed |
| `miejscownik-pelny` | o kim, o czym, przy, po |
| `rozkaznik-pelny` | ty, wy, my; nie + ndk |
| `modalne-obowiazek` | powinienem, trzeba, nie wolno, warto |
| `biernik-osobowy` | znam brata, widzę kolegów |
| `przymiotnik-przypadki` | прикметник у відмінках однини |
| `przyimki-kierunku` | gdzie / dokąd / skąd |
| `isc-jechac-przedrostki` | przyjść, wyjść, dojechać (основи) |
| `warunkowy-prosby` | mógłbyś, czy mógłby Pan |
| `stopniowanie` | ступені прикметників і прислівників |
| `porownania` | niż / od, im… tym, najlepszy |
| `ktory-podstawy` | який: називний, знахідний |
| `zdania-zlozone-ze` | że, bo, ponieważ, dlatego, więc |
| `zdania-celu-zeby` | żeby + інфінітив |
| `mowa-zalezna-podstawy` | powiedział, że…; zapytała, czy… |
| `zaimki-wskazujace` | ten, tamten, taki, ktoś, coś |
| `mnoga-przypadki` | множина: знахідний, родовий, орудний |
| `rejestr-formalny` | Szanowny Panie, w sprawie, z poważaniem |
| `spojniki-narracyjne` | najpierw, potem, w końcu, poza tym |

### B1
`przypadki-funkcje` · `przypadki-przyimki` · `rzecz-lp-meski` · `rzecz-lp-zenski` · `rzecz-lp-nijaki` · `przym-lp` · `zaimki-przym` · `mn-mianownik-mos` · `mn-przypadki` · `rzecz-nieregularne` · `koniugacje` · `czasowniki-nieregularne` · `aspekt-tworzenie` · `aspekt-uzycie` · `ruch-przedrostki` · `ruch-iterat` · `zaimki-formy` · `enklityki-zaimki` · `ktory-przypadki` · `wzgledne-inne` · `przyczyna-skutek` · `przyimki-przyczyny` · `przyzwolenie` · `przeciwstawienie` · `zeby-cel` · `zeby-zyczenie` · `niech` · `mowa-zalezna` · `pytania-zalezne` · `przypuszczajacy-formy` · `by-ruchome` · `warunek-realny` · `warunek-nierealny` · `modalne` · `rozkazujacy` · `rozkazujacy-aspekt`

### B2
`bierna-byc-zostac` · `bierna-czasy` · `bezosobowe-no-to` · `bezosobowe-sie` · `imieslow-czynny` · `imieslow-bierny` · `imieslow-ac` · `imieslow-wszy` · `odczasownikowe` · `liczebniki-odmiana` · `liczebniki-skladnia` · `liczebniki-zbiorowe` · `liczebniki-daty` · `przyimki-zlozone` · `rekcja` · `zaimki-nieokreslone` · `negacja-podwojna` · `slowotworstwo` · `sie-znaczenia` · `szyk` · `partykuly`

Повні польські й українські назви — у `course_grammar_points` (колонки `title_pl`, `title_uk`) і в `docs/grammar-registry.json`.

## 4. Мапінг старих тегів

Таблиця `course_grammar_aliases` (alias → grammar_point) і `docs/grammar-registry.json` містять усі теги, які реально стоять у вправах. Логіка мапінгу:

- деталізації однієї теми згортаються в її канон: `narzednik`, `narzednik-formy`, `narzednik-koncowki`, `narzednik-lp`, `z-kim`, `nad-pod-przed-za` → `narzednik-pelny`;
- усі варіанти множини (`lm-*`, `*-mnoga`, `*-lm`) → `mn-przypadki`, крім називного множини й чоловічо-особових форм (`ci-te`, `oni-one`, `meskoosobowe-*`, `przeszly-li-ly`) → `mn-mianownik-mos`;
- функціональні теги уроків для англомовних і фахових курсів (`wiek`, `jednostki`, `procent`, `ulamki`, `rownania-na-glos`) → `liczebnik-rzeczownik` / `liczebniki-odmiana` / `slownictwo`;
- правописні пари літер (`a-e`, `ch-h`, `rz-z`, `o-u`, `i-y-j`, `konc-e`, `konc-y-i`) → `pisownia`;
- комунікативні ярлики (`rady`, `propozycje`, `polecenia`, `opis-osoby`, `przedstawianie`) → граматика, яку вони насправді тренують.

Мапінг **не переписує** історію: `embed_attempts` лишаються як є, а читаються через `v_attempts_canon` (додає колонку `canon_point`). Mastery рахує `v_tag_mastery`: ≥80% правильних **і** тег у ≥2 уроках, службові теги виключені.

## 5. Перевірка перед публікацією

```bash
python3 scripts/check_tags.py            # увесь каталог
python3 scripts/check_tags.py --changed  # лише змінені файли
python3 scripts/check_tags.py --stats    # у скількох уроках стоїть кожен тег
```

Перевірка входить у ворота публікації уроку (CLAUDE.md, крок після `check_answers.py`). Тег поза списком — помилка публікації, а не привід додати ще один синонім.

Стан на 2026-11-16: 497 сирих тегів → **103 у вжитку**, з них **72 закріплені у 2+ уроках** (рахуються в mastery). Решта 31 — поки в одному уроці; список друкує `--stats`.
