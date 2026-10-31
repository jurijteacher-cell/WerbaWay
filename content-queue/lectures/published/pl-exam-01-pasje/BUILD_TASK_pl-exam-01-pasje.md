# BUILD_TASK · pl-exam-01-pasje

Урок 1 екзаменаційного модуля (`module: pl-exam`) — «Czas wolny i pasje», A1→A2, 2 × 60 хв.
Виконавець — Claude Code (хмарна сесія з доступом до репозиторію `jurijteacher-cell/werbaway`). Зміст пише Claude у чаті проєкту «Лекції під іспити».

**Правила:** `rules/02_STYLE_VISUAL.md`, `rules/04_TASKS.md`, `rules/06_BUILD_AND_CHECKLIST.md`.

**Не можна:** змінювати зміст (тексти, відповіді, `accept[]`, `grammar_point`, слайди); підміняти тип вправи чи рендерити блок текстом; чіпати інші уроки. Помилка в змісті → у звіт, а не правка.

## Склад пакета

| Файл | Що це | Тип |
|---|---|---|
| `pl-exam-01-pasje.md` | вихідник сторінки з маркерами | — |
| `pl-exam-01-pasje-slides.json` | презентація, 17 слайдів, 2 частини | `grammar-slides` |
| `pl-exam-01-pasje-vocab.json` | 25 карток, 4 групи | `vocab-cards` |
| `pl-exam-01-pasje-pictures.json` | 3 фото з питаннями-опорами | `picture-set` |
| `pl-exam-01-pasje-comm-tasks.json` | c1 (діалог читає вчитель), c2, c3 | `flip-task` |
| `pl-exam-01-pasje-grammar.json` | g1–g7 | `fill-in-blank`, `matching`, `sentence-building`, `drag-and-drop` |
| `pl-exam-01-pasje-exam.json` | e1 (читання P/F), e2 (слухання, 6 висловлювань — читає вчитель) | `true-false`, `multiple-choice` |
| `pl-exam-01-pasje-hw.json` | h1–h3 | `fill-in-blank`, `sentence-building` |
| `pl-exam-01-pasje-teacher.md` | файл викладача, розділ 7 — тексти для читання вголос; **учням не публікується** | — |
| `pl-exam-01-pasje-images.lock.json` | фото, взяті з Unsplash | — |

## Слухання — читає вчитель

Аудіо не генерується. Жодних mp3, TTS, полів `voice`, `audio_id`.

| Де | У даних | Учень бачить | Вчитель (`?teacher=1`) |
|---|---|---|---|
| Czytanie | `[AUDIO: …, source="teacher", plays="1"]` | наліпку «Słuchaj — czyta nauczyciel · raz» | те саме; текст і так на сторінці |
| c1 | `audio_source: "teacher"` у `c1` | наліпку + «Tekst rozmowy — po słuchaniu» згорнуто | діалог розгорнуто |
| e2 | блок `audio_source: "teacher"`, `reads: 2`, `dialogue` в кожному елементі | наліпку «dwa razy» над кожним питанням; тексту **немає навіть у коді сторінки** | текст репліки над питанням |

Реалізація: `src/components/exercises/TeacherReads.tsx`, `src/lib/teacher-reads.ts` (вирізає `dialogue` для учня), режим `?teacher=1` на `/lessons/[slug]`, `/embed/[id]/exam`, `/embed/[id]/comm-tasks`.

## Фото

Усі 5 слотів зараз `missing` (Unsplash не відпрацював). Щоб заповнити: ключ `UNSPLASH_ACCESS_KEY`, алгоритм з `rules/06` дослівно, результат → `images.lock.json`. Слоти: `header` («friends playing music» / «woman playing guitar»), `czytanie` («man playing drums» / «drum set room»), `p1`–`p3` — ключі в `pictures.json`.

## Перевірка

```bash
python3 scripts/check_lesson_package.py content-queue/lectures/published/pl-exam-01-pasje   # 0 ERROR
npx tsc --noEmit && npx next build
LESSON_URL=… npx playwright test tests/lesson-exercises.spec.ts
```

Плюс вручну: `/lessons/pl-exam-01-pasje` і `?teacher=1`, ширина 390 px.

## Звіт

УРОК · PREVIEW · ПЕРЕВІРКА (валідатор / build / e2e) · ФОТО · ЗАЛИШИЛОСЯ · ПОМИЛКИ В КОНТЕНТІ — без переказу процесу.
