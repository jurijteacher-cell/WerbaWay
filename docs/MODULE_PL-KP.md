# Werba Way — модуль pl-kp (Karta Polaka, розмова з консулом)

Індивідуальний учень, рівень A1+ · 90 хв · Notion: «Вправи — Werba Way / pl-kp».

## Уроки
| n | id | Тема | Статус |
|---|---|---|---|
| 1 | (B1-група) Wydarzenia | Дати й історія Польщі | пройдено |
| 2 | pl-kp-02-swieta | Wesołych Świąt! Polskie święta i tradycje | готово 2026-10-22 |
| 3 | pl-kp-03-o-sobie-korzenie | Nazywam się… Ja i moje polskie korzenie | готово 2026-10-27 |
| 4 | — | Symbole narodowe: flaga, godło, hymn | план |
| 5 | — | Geografia: stolica, rzeki, góry, morze, sąsiedzi | план |
| 6 | — | Znani Polacy | план |
| 7 | — | Pełna symulacja rozmowy z konsulem (+ текст deklaracji) | план |

Блок «o sobie i polskich korzeniach» не проходили до 2026-10-27 — закрито уроком 03.

## Як зібрано pl-kp-02 (без Cursor)
- Вправи: standalone HTML на рендерері pl-kpk1 (`public/standalone/pl-kp-02-swieta-{czytanie,slownictwo,gramatyka-1,gramatyka-2,zadania,praca-domowa}.html`), коміт `cbb5b96` у main; у Notion — embed через htmlpreview.github.io з хешем коміту.
- Граматика замість слайдів — таблиці «Ściąga» у toggle на сторінці Notion.
- Аудіо немає: діалог c1 викладач читає з учнем у ролях.
- Teacher-сторінка поруч у модулі (план хвилин, типові помилки, рубрика, зразок листа).
- Граматичні теги: data-swieta, w-na-swieto, przed-po-swieta, forma-my-wy, szyk, dialog, kalki-uk.

## Як зібрано pl-kp-03 (LESSON_PROTOCOL v3.11)
- Вправи — LMS JSON у `src/content/queue-published/pl-kp-03-o-sobie-korzenie-{vocab,grammar,comm-tasks,hw}.json`; embed `werba-way.vercel.app/embed/pl-kp-03-o-sobie-korzenie/…` (grammar: g1 · g2-g3 · g4-g6).
- Граматика — рідні блоки Notion (8 блоків + wyjątki + 6 пасток), без toggle.
- Учень: https://app.notion.com/p/40696e03c7c881a8ae0de296c9a5249d · TEACHER: https://app.notion.com/p/40696e03c7c88141ab38d83861b9be94
- Граматичні теги: wiek-lat-lata, jestem-narzednik, jako-mianownik, z-dopelniacz, w-miejscownik, data-dopelniacz, przedstawianie, przeszly-3-osoba, byc-narodowosc-narzednik, rodzina-dopelniacz, chce-bo, kalki-uk, slownictwo-rodzina, slownictwo-dokumenty, powtorka-swieta.
- Повторення: дати в dopełniaczu (урок 1), Wigilia/opłatek/kolędy і форма «my» (урок 2).
