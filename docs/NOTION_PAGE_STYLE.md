# Werba Way — NOTION_PAGE_STYLE (v1.0, 2026-10-20)

Як виглядає сторінка лекції в Notion. Обов'язково для **всіх нових лекцій** і для перезбирання старих.

Еталон: «04 · Poproszę pierogi! Jedzenie i restauracja» (`pl-a2-mow-04-jedzenie`) — https://app.notion.com/p/3fe96e03c7c881e58aa0cba4eec82ac1

Ідея: текст не пісний, але й не перенасичений. Колір і іконки дають структуру й ритм, **зміст не змінюється**. `{id}.md` лишається чистим вихідником з маркерами; це оформлення накладається під час публікації в Notion (Cursor або Claude, хто публікує).

Пріоритет: у питаннях вигляду сторінки Notion цей файл головніший за `STYLE_NOTEBOOK` (той описує LMS-компоненти й слайди) і доповнює `CURSOR_BUILD_RULES`.

---

## 0. Загальні правила

1. **Не перенасичувати.** Максимум одна плашка (callout) на підрозділ. Без емодзі всередині звичайного тексту. Без кольорового основного тексту — колір лише в мітках, заголовках і шапках таблиць.
2. **Не підказувати відповіді.** Іконки й кольори не можуть видавати відповідь на питання до тексту (напр., жодних зірок чи червоного/зеленого на відгуках, якщо учень має вгадати оцінку).
3. **Нічого службового.** Жодних мета-приміток, TODO, технічних коментарів на сторінці учня.
4. **Підписи не губити.** Кожне фото має підпис `{alt}. Fot. {автор} / Unsplash`, кожен embed — свій підпис (`Słownictwo — karty`, `Slajdy gramatyczne`, `Ćwiczenia gramatyczne — g1-g3`, `Zadania komunikacyjne`, `Praca domowa`). Після публікації перевірити, що підписи на місці.
5. **Full width** сторінки й розгорнуті вікна вправ — як і раніше (`CURSOR_BUILD_RULES` §7).
6. **Іконка сторінки** — один емодзі за темою лекції. Береться з frontmatter `notion_icon` (Claude ставить його в пакеті; приклад: `notion_icon: "🥟"`).

## 1. Палітра

| Що | Колір |
|---|---|
| Цілі уроку, Podsumowanie | `green_bg` |
| Розминка «Zanim przeczytasz», голосове повідомлення в ДЗ | `yellow_bg` |
| «Najpierw zgadnij» / передзавдання до питань | `orange_bg` |
| Вступ до граматики | `purple_bg` |
| Швидкі відповіді в Praktyka A | `pink_bg` |
| Гра / рольове завдання (Praktyka C) | `green_bg` |
| Słownictwo-вступ, «Warto użyć», картки голосів у тексті | `gray_bg` |
| «Minuta bez przerwy» | `red_bg` |
| Pisanie в ДЗ | `blue_bg` |
| Źródła (джерела інформації, не фото) | заголовок `gray` |

**Групи слів** (і в Słownictwo, і в Słowniczku) — фіксований порядок кольорів: 1 `orange` · 2 `blue` · 3 `green` · 4 `purple` · 5 `pink` · 6 `brown`. Та сама група має той самий колір у вступі до Słownictwa, у заголовку H3 Słowniczka і в шапці таблиці (`*_bg`).

**Мітки у «Warto użyć»** — за порядком: `green` · `blue` · `red` · `orange` · `purple` · `pink`.

## 2. Заголовки розділів (H2)

Емодзі перед номером, номер і назва — з `.md`:

| Розділ | Заголовок |
|---|---|
| Czytanie | `## 📖 1. Czytanie` |
| Pytania do tekstu (H3) | `### ❓ Pytania do tekstu` |
| Słownictwo | `## 📚 N. Słownictwo` |
| Gramatyka | `## 🧩 N. Gramatyka: …` |
| Praktyka mówienia | `## 🗣️ N. Praktyka mówienia` |
| Zadania komunikacyjne | `## 🎭 N. Zadania komunikacyjne` |
| Jak na egzaminie | `## 🎓 N. Jak na egzaminie: …` |
| Podsumowanie | `## ✅ N. Podsumowanie` |
| Praca domowa | `## 🏠 N. Praca domowa` |
| Słowniczek | `## 📒 Słowniczek` |
| Źródła | `## Źródła {color="gray"}` (без емодзі); лише джерела фактів — див. LESSON_PROTOCOL «Точність фактів» |

Підрозділи H3 (назва тексту, A/B/C у практиці, частини ДЗ, групи Słowniczka) — одне тематичне емодзі на початку. Розділювачі `---` між розділами лишаються.

## 3. Розділ за розділом (Notion-flavored Markdown)

### Cele lekcji
```
<callout icon="🎯" color="green_bg">
	**Po tej lekcji potrafisz:**
	- …;
	- …;
	- …
</callout>
```
Пункти без емодзі (іконка вже в плашці).

### Czytanie
```
## 📖 1. Czytanie
<callout icon="✏️" color="yellow_bg">
	**Zanim przeczytasz:** …
</callout>
### {емодзі теми} {Назва тексту}
{вступний абзац; завдання до читання — жирним}
```
- **Текст із кількох голосів** (відгуки, листи, пости, коментарі, оголошення): кожен голос — `gray_bg` callout у **двох колонках** (`<columns>`), порядок як у тексті (ліва колонка — перша половина). Перший рядок: `**Ім'я** <span color="gray">· вік / мета</span>`, далі текст. Іконка — нейтральна за персонажем (🎓 студент, 👵 пенсіонерка, 🌍 турист…), не за оцінкою.
- **Суцільний текст** — звичайні абзаци, без плашок.
- Фото — з підписом (див. §0.4).
- `Najpierw zgadnij` / передзавдання → `orange_bg`, іконка ⭐ або за змістом; питання — звичайний нумерований список.

### Słownictwo
```
## 📚 2. Słownictwo
<callout icon="{овоч/емодзі теми}" color="gray_bg">
	**{N} słów** w {k} grupach: <span color="orange">**група 1**</span> · <span color="blue">**група 2**</span> · …
	{інструкція з .md}
</callout>
<embed src="…/vocab">Słownictwo — karty</embed>
```

### Gramatyka
```
<callout icon="💡" color="purple_bg">
	{вступ з .md}
	<span color="green">**формула 1…**</span>   ·   <span color="red">**формула 2…**</span>   ·   <span color="blue">**формула 3…**</span>
</callout>
```
Формули — ключові конструкції з назви розділу, без нових пояснень. Рядок перед вправами починається з `✍️ **Ćwiczenia** — …`.

### Praktyka mówienia
- **A (швидкі відповіді):** інструкція в `pink_bg` ⚡; якщо пунктів ≥6 і вони короткі — дві колонки, кожен пункт з одним емодзі предмета.
- **B (дискусія):** вступне речення — `<span color="gray">*…*</span>`, питання — звичайний список.
- **C (гра / рольове):** текст завдання в `green_bg` 🤔; ключове обмеження (кількість питань, час) — жирним.

### Zadania komunikacyjne
```
<callout icon="🧰" color="gray_bg">
	**Warto użyć**
	- <span color="green">**Мітка 1:**</span> фраза · фраза
	- <span color="blue">**Мітка 2:**</span> …
</callout>
👉 **Teraz Twoja kolej.** {решта речення з .md}
<embed …>Zadania komunikacyjne</embed>
```

### Jak na egzaminie
Вимога в інструкції — жирним (`**minimum trzy zdania**`). «Minuta bez przerwy» → `red_bg` ⏱️.

### Podsumowanie
```
<callout icon="🏁" color="green_bg">
	**Sprawdź, czy umiesz to, co obiecaliśmy na początku:**
	- [ ] …
	- [ ] …
</callout>
```
Чекбокси, щоб учень сам відмічав. Зелений — у пару до цілей уроку.

### Praca domowa
- Перелік частин — кожна жирним.
- Голосове повідомлення: H3 `🎙️`, текст у `yellow_bg` з тематичною іконкою; тривалість — жирним.
- Pisanie: H3 `✍️`, текст у `blue_bg`; обсяг (`**80–100 słów**`) жирним; «**W opinii:**» / «**W liście:**» жирним, пункти — список усередині плашки.

### Słowniczek
```
## 📒 Słowniczek
<span color="gray">*{вступ з .md}*</span>
### {емодзі} {Група 1} {color="orange"}
<table fit-page-width="true" header-row="true">
<tr color="orange_bg">
<td>Słowo</td><td>Tłumaczenie</td><td>W zdaniu</td>
</tr>
…
</table>
```
Слово в першому стовпчику — жирним, як і раніше. Кольори груп — з §1.

### Źródła
```
<h2 color="gray">Źródła</h2>
<span color="gray">*Skąd są fakty w tekście i w ćwiczeniach. Stan prawny na {місяць рік}.*</span>
- **{факт коротко}:** [{сайт} — {назва сторінки}]({url})
```
Тільки звідки взято інформацію (закони, офіційні сторінки, статті). Кредити фото тут не ставляться (2026-10-25): автор — у підписі фото, обкладинка — на сторінці TEACHER. В еталоні «Poproszę pierogi!» Źródła ще у старому вигляді.

## 4. Технічно (для того, хто публікує або правит)

- Правки існуючої сторінки — тільки точковими `update_content`, ніколи `replace_content`: інакше перестворюються embed-блоки (злітає висота вікон і підписи).
- Блоки, які не чіпаєш (embed, фото), не включати в `old_str`.
- Після публікації: fetch сторінки й перевірка — підписи фото й embed на місці, колонки й плашки відрендерені, на сторінці немає жодного маркера `[…]`.
