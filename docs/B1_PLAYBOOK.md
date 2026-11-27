# B1 ДЕРЖАВНИЙ — що робити на «роби б1» (27.11.2026)

Прочитай лише цей файл і приклад `pl-b1-probny-08` (JSON, `scripts/mock_audio/…voices.json`, `scripts/b1/…oral.json`). Питань Юрі не став.

## Команди

| Юра пише | Це означає |
|---|---|
| **«роби б1»**, «роби екзамен б1», «роби державний» | наступний **пробний державний іспит** `pl-b1-probny-{NN}` (найбільший номер у `src/content/queue-published/pl-b1-probny-*-mock.json` + 1), модуль `pl-b1-cert` |
| «роби урок б1» | наступна **лекція** групи `pl-b1-group` з черги `STATE.md` / `CURRICULUM_GROUP_B1.md` (звичайний протокол `LESSON_PROTOCOL.md`) |
| «пробний іспит курсу B1» | окремий іспит по матеріалу лекцій `pl-b1-group` 1–22 (пункт у `STATE.md`) — **не** «роби б1» |

Telc — інший формат і інша команда: `TELC_PLAYBOOK.md`.

**Дозволи (Юра, 27.11):** коміти, push у `main`, деплой і озвучення — самостійно, від початку до кінця, без підтверджень.

## Порядок

1. Репо: `add_repo(jurijteacher-cell/WerbaWay, access=push)` → `git clone --depth 1`.
2. `account_get_usage` (ElevenLabs): 08 = 9,7 тис. знаків (eleven_v4 ≈ 0,33 кредиту/знак → ≈ 3,2 тис. кредитів); май запас ≥ 4 тис. Не вистачає → слухання не публікуй, скажи Юрі.
3. Подивись теми попередніх номерів і **не повторюй** (скрипт нижче).
4. Напиши три файли (зручно одним Python-генератором у скретчі, як для 08):
   - `src/content/queue-published/{id}-mock.json` — структура як у 08; `explain` у кожному пункті; транскрипти `Мовець: репліка`, блоки через порожній рядок, **числа словами** (голос читає текст як є);
   - `scripts/mock_audio/{id}.voices.json` — `cast` без змін; `tasks.rs1…rs5`: `voices`, `segments` (новий сегмент — кожен блок, що починається з `Lektor:` і має ще репліки), `tags` емоцій для rs1 (`[angry]`, `[warmly]`, `[sad]`, `[sarcastic]`…), `block_gap`;
   - `scripts/b1/{id}.oral.json` — номер, обкладинка (та сама), 3 zestawy (фото, питання до фото, монолог, діалог, роль екзаменатора з ускладненням), нотатки до письма, пастки.
5. Перемішати й зібрати:
   ```bash
   python3 scripts/shuffle_options.py {id}      # варіанти a/b/c; cloze-варіанти й літери matching розкидай у генераторі сам
   python3 scripts/build_b1_exam.py {id}        # перевірка формату + аудіосценарій, обидві сторінки, мови, манифест
   python3 scripts/check_answers.py {id} && node scripts/i18n-coverage.mjs {id} && python3 scripts/check_embeds.py --page src/content/pages/{id}.md
   ```
   `check_lecture.py` для іспитів не застосовується (вимагає vocab / hw). Ключ у TEACHER будується з JSON — після будь-якої правки JSON запусти build ще раз.
6. Коміт і push: `git fetch --depth=50 origin main && git rebase origin/main && git -c push.negotiate=true push origin HEAD:main`. Vercel деплоїть сам (1–3 хв).
7. Озвучення (платиться один раз): `mcp__Vercel__web_fetch_vercel_url` **по одному**:
   `https://werba-way.vercel.app/audio/{id}/b1-sluchanie-1.mp3` … `-5.mp3` (очікуй 302).
   Потім `https://werba-way.vercel.app/api/audio/_status?lesson={id}` → усі `ready: true`.
8. `python3 scripts/check_embeds.py {id} --remote` = ✓. У манифесті `audio.status` → `ready (дата)`. Онови таблицю в `MOCK_EXAM_SPEC.md` і `STATE.md`. Push.

Теми попередніх номерів:
```bash
python3 -c "
import json,glob
for f in sorted(glob.glob('src/content/queue-published/pl-b1-probny-*-mock.json')):
    for s in json.load(open(f))['sections']:
        for t in s['tasks']:
            print(f[-13:-10], t['id'], t.get('passage_title') or t.get('instruction','')[:90] or '', [c['intro'] for c in t.get('choices',[]) if 'intro' in c])
"
grep -h -A3 '^### Zestaw' src/content/pages/pl-b1-probny-*.md | grep -E 'Monolog|Dialog' | cut -c1-120
```

## Формат (90 p. + письмо, перевіряє `build_b1_exam.py`)

| id | Що | Пунктів × бал | Тип у JSON | Аудіо |
|---|---|---|---|---|
| rs1 | 14 коротких записів + приклад: «Gdzie można usłyszeć…?» / «To jest…» (функція: skarga, rada, ironia…) | 14 × 0,5 | `mc-passages` | 1 раз |
| rs2 | 7 діалогів + приклад, кожен повторений у записі | 7 × 1 | `mc-passages` | 1 раз (повтор вшитий) |
| rs3 | інтерв'ю, TAK/NIE | 5 × 1 | `true-false` | 2 рази |
| rs4 | 4 особи, 6 думок (`reuse_keys`) | 6 × 1 | `matching` | 2 рази |
| rs5 | 10 порад до 12 емодзі-картинок (приклад + 1 зайва) | 10 × 0,5 | `matching` | 1 раз (повтор вшитий) |
| rt1 | 5 коротких текстів, «Z tego tekstu wynika, że» | 5 × 1 | `mc-passages` | — |
| rt2 | стаття, TAK/NIE | 7 × 1 | `true-false` | — |
| rt3 | текст, вставити фрагменти A–I (1 зайвий) | 7 × 1 | `cloze`, `bank` | — |
| rt4 | заголовки → фрагменти A–I (1 зайвий) | 7 × 1 | `matching` | — |
| rt5 | лексика / колокації, 3 варіанти | 8 × 0,5 | `cloze`, `options` | — |
| pg1 | відмінки (іменники, прикметники, займенники) | 10 × 0,5 | `cloze`, `options` | — |
| pg2 | сполучники, `bank_words` 7 (1 зайве) | 5 × 0,5 | `cloze`, `bank` | — |
| pg3 | ступенювання | 5 × 0,5 | `cloze`, `options` | — |
| pg4 | минулий час, вписати (`input` + `accept`) | 10 × 0,5 | `cloze`, `input` | — |
| pg5 | питання до підкресленого | 5 × 0,5 | `questions` | — |
| pg6 | трансформації з ключовим словом | 5 × 1 | `transform` | — |
| pg7 | вид і способи | 10 × 0,5 | `cloze`, `options` | — |
| pg8 | прийменники, `bank_words` 7 (1 зайве) | 5 × 0,5 | `cloze`, `bank` | — |
| pi1 | 3 zestawy × (короткий 30–40 + довгий 160–170 слів) | AI, 30 | `writing`, `manual` | — |

Поріг: 50% у кожній частині. Аудіофайли — `/audio/{id}/b1-sluchanie-{1..5}.mp3`, сценарій — `src/content/audio/{id}.json` (генерує build). Сторінки — модуль `pl-b1-cert`, `number` = номер іспиту, усна частина: 3 zestawy (zdjęcie · monolog · dialog). Структура іспиту — `EXAMS_TELC_vs_PANSTWOWY_B1.md`.

## Якість

- Теми дорослі, побутові; люди, фірми, ціни вигадані. Рівень B1.
- Правильна відповідь перефразована, дистрактор спирається на слово з тексту / запису; позиції відповідей і літери розкидані (не A-B-C-D підряд).
- TAK/NIE не суперечить деталям запису — перечитай транскрипт під кожен пункт.
- Граматика: перевір рід/число, керування дієслів, `accept` у pg4–pg6 з варіантами (рід мовця, порядок слів).
- Фото — Unsplash (плагін; `download_asset` для вибраних).
