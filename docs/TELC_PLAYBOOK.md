# TELC — що робити на «роби telc» (27.11.2026)

Прочитай лише цей файл і приклад `pl-telc-probny-07`. Питань Юрі не став.

## Команди

| Юра пише | Це означає |
|---|---|
| **«роби telc»** | наступний **пробний іспит** `pl-telc-probny-{NN}` (найбільший номер у `src/content/queue-published/*-mock.json` + 1) |
| «роби урок telc» | наступний **урок** курсу `pl-telc-b1` за `CURRICULUM_TELC_B1.md` (звичайний протокол `LESSON_PROTOCOL.md`, глоси російською) |

**Дозволи (Юра, 27.11):** коміти, push у `main`, деплой і озвучення — самостійно, від початку до кінця, без підтверджень.

## Пробний іспит: порядок

1. Репо: `add_repo(jurijteacher-cell/WerbaWay, access=push)` → `git clone --depth 1`.
2. `account_get_usage` (ElevenLabs): потрібно ≈ 6–8 тис. кредитів. Не вистачає → не публікуй слухання, скажи Юрі.
3. Подивись теми попередніх номерів і **не повторюй** (скрипт нижче).
4. Напиши три файли:
   - `src/content/queue-published/{id}-mock.json` — копія структури попереднього номера; `explain` у кожному пункті; транскрипти `Мовець: репліка`, блоки через порожній рядок;
   - `scripts/mock_audio/{id}.voices.json` — `cast` без змін, `tasks.sl1…sl4`: голоси, `segments`, паузи (60 с у sl3, 30 с у sl4);
   - `scripts/telc/{id}.oral.json` — номер, обкладинка (та сама), 2 фото, питання, 2 теми, дискусія, додаткові питання, пастки.
5. Зібрати й перевірити:
   ```bash
   python3 scripts/build_telc_exam.py {id}      # аудіосценарій, обидві сторінки, мови, манифест
   python3 scripts/check_answers.py {id} && node scripts/i18n-coverage.mjs {id} && python3 scripts/check_embeds.py {id}
   ```
   `check_lecture.py` / `check_lesson.py` для іспитів не застосовуються (вимагають vocab / hw).
6. Коміт і push: `git -c push.negotiate=true push origin HEAD:main`. Vercel деплоїть сам (1–3 хв).
7. Озвучення (≈ 1 кредит за знак, платиться один раз): `mcp__Vercel__web_fetch_vercel_url` по черзі, **по одному**:
   `https://werba-way.vercel.app/audio/{id}/telc-sluchanie-1.mp3` … `-4.mp3` (або вкладка Chrome).
   Потім `https://werba-way.vercel.app/api/audio/_status?lesson={id}` → усі `ready: true`.
8. `python3 scripts/check_embeds.py {id} --remote` = ✓. Онови таблицю в `MOCK_EXAM_SPEC.md`, `CURRICULUM_TELC_B1.md` §5, `STATE.md`. Push.

Теми попередніх номерів:
```bash
python3 -c "
import json,glob
for f in sorted(glob.glob('src/content/queue-published/pl-telc-probny-*-mock.json')):
    for s in json.load(open(f))['sections']:
        for t in s['tasks']:
            print(f[-16:-10], t['id'], t.get('passage_title') or (t.get('transcript') or '')[250:370].replace(chr(10),' ') or [c['label'] for c in t.get('choices',[])] or t['items'][0].get('passage',t['items'][0].get('text',''))[:60])
"
grep -h -E '^### Część|<b>Temat' src/content/pages/pl-telc-probny-*.md
```

## Формат (59 пунктів, перевіряє скрипт)

| id | Що | № | Тип у JSON |
|---|---|---|---|
| sl1 | 4 голосові повідомлення + приклад | 1–4 | `mc-passages` |
| sl2 | 5 діалогів × (prawda/fałsz + a/b/c) | 5–14 | `mc-passages`, `kind: tf` |
| sl3 | інтерв'ю | 15–20 | `mc-passages` |
| sl4 | думки: приклад + 3, твердження a–f | 21–23 | `matching` |
| cz1 | 4 тексти, теми a–f (2 зайві) | 24–27 | `matching` |
| cz2 | 5 ситуацій, оголошення a–h + x (рівно один x) | 28–32 | `matching`, `reuse_keys` |
| cz3 | 3 тексти × 2 | 33–38 | `mc-passages` |
| cz4 | регламент, prawda/fałsz + приклад | 39–41 | `true-false` |
| el1 | телефонна розмова, банк a–j (2 зайві) | 42–49 | `cloze`, `bank` |
| el2 | півофіційний e-mail, 10 × 3 варіанти | 50–59 | `cloze`, `options` |
| pi | e-mail, тема A або B, 3 пункти, ≈150 слів | — | `writing`, `manual` |

Поріг: B1 від 27, B2 від 43. Кожен запис — один раз. Структура іспиту — `EXAMS_TELC_vs_PANSTWOWY_B1.md`.

## Якість

- Теми дорослі, побутові; люди, фірми й ціни вигадані. Рівень B1 з елементами B2.
- Правильна відповідь перефразована, дистрактори спираються на слова з тексту; без знання тексту не вгадується; позиції відповідей розкидані.
- Твердження prawda/fałsz не повинно суперечити деталям запису (перечитай транскрипт під кожен пункт).
- Модуль `pl-telc-probny`, номер = номер іспиту; обидві сторінки.
- Фото — Unsplash (плагін; `download_asset` для вибраних).
