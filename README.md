# Werba Way — сайт школи польської

Next.js 14 (App Router) + TypeScript + Tailwind + Supabase (Auth / Postgres / RLS) + Vercel.
Прод: **werbaway.com** (той самий сайт — `werba-way.vercel.app`). Push у `main` → Vercel деплоїть сам.

Учень заходить, відкриває лекцію, гортає її сторінками й виконує вправи з перевіркою;
викладач веде заняття в класі, бачить роботу учня наживо, перевіряє письмо, відкриває доступи.
Сайт чотиримовний (укр · рос · пол · англ), польський матеріал ніколи не перекладається.

## Як контент потрапляє на сайт

Лекції — **файли в репо**, не база і не CMS:

```
src/content/pages/<slug>.md              сторінка учня   → /learn/<slug>
src/content/teacher-pages/<slug>.md      сторінка викладача (teacherOf: <slug>) → /teacher/lesson/<slug>
src/content/queue-published/<id>-*.json  вправи → /embed/<id>/<type>
src/content/i18n/pages/<slug>.<loc>.json переклади пояснень (ru / pl / en)
content-queue/_manifest.json             реєстр опублікованих уроків
```

**Лекція вважається опублікованою лише тоді, коли в репо є всі чотири: сторінка учня,
сторінка викладача, усі JSON вправ зі сторінки і запис у манифесті.** Лекція лише в Notion
на сайті не існує (так сталося з уроками 65–66).

Повний порядок публікації, формат сторінки, перевірки й чек-лист — **[docs/SITE_PUBLISHING.md](docs/SITE_PUBLISHING.md)**.
Зміст і стиль лекції — [docs/LESSON_PROTOCOL.md](docs/LESSON_PROTOCOL.md). Вигляд UI —
[docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md). Схеми JSON вправ — [docs/CONTENT_SPEC.md](docs/CONTENT_SPEC.md).
Багатомовність — [docs/I18N_TRANSLATION_BRIEF.md](docs/I18N_TRANSLATION_BRIEF.md).

Старі кіно-уроки з MVP (`src/content/lessons/*.ts`, `src/content/lectures/*.ts`, маршрути
`/lessons`, `/lectures`) лишаються як є — нові лекції туда не додаються.

## Перевірки

```bash
npm run check:lesson <lesson_id>     # сторінка, викладач, вправи, module, манифест
npm run check:lesson -- --changed    # те саме для лекцій, змінених у цій гілці (так само в CI)
npm run check:embed-theme            # темні токени в embed (невидимий текст), також prebuild
npx tsc --noEmit
LESSON=<lesson_id> npm run test:lesson   # смоук: лекція гортається, вправи рахують, текст читабельний
```

Смоук-тесту потрібен піднятий сайт (`npm run dev`); щоб він перевірив і саму лекцію, а не лише
вікна вправ, дай акаунт: `STUDENT_EMAIL=… STUDENT_PASSWORD=…`.

На кожен PR у `main` ці перевірки проганяє `.github/workflows/lesson-checks.yml`.
**Лекції йдуть у `main` через гілку й PR**, бо деплой автоматичний і півлекції в `main`
означає зламану лекцію в продакшені.

## Маршрути

| | |
|---|---|
| `/learn`, `/learn/<slug>`, `/learn/<slug>/hw` | список лекцій учня, лекція, домашка |
| `/embed/<id>/<type>` | окрема вправа (вона ж iframe у Notion і в класі) |
| `/slides/<id>` | презентація граматики (`?teacher=1` — вид викладача) |
| `/class`, `/teacher/class`, `/teacher/live` | клас: кроки заняття, живе дзеркало роботи учня |
| `/teacher/lesson/<slug>` | нотатки до уроку |
| `/teacher/students`, `/teacher/students/<id>` | учні, доступи до курсів і лекцій, результати |
| `/teacher/exams`, `/teacher/results`, `/teacher/analytics` | пробні іспити, перевірка письма, аналітика |
| `/words`, `/words/play` | словникові колоди учня й тренування |
| `/s/<token>` | публічне посилання на одну лекцію |

Хто що бачить: викладач — усе; учень — курси й лекції, відкриті йому в `student_access`,
плюс пройдені в класі (`src/lib/pages/access.ts`). Нова лекція з'являється учню сама, якщо
її `module` — код уже відкритого йому курсу.

## Запуск локально

1. `npm install`
2. Проєкт на [supabase.com](https://supabase.com); у SQL Editor виконай по черзі міграції з `supabase/migrations/`.
3. **Обов'язково руками**: Supabase → Project Settings → Realtime → вимкни «Allow public access».
   Без цього RLS-політики на приватні канали не працюють і чернетки учня технічно доступні
   будь-якому авторизованому клієнту, не лише викладачу.
4. `.env.local.example` → `.env.local`, встав `Project URL` і `anon public key`.
5. `npm run dev` → http://localhost:3000

## Як стати викладачем

На реєстрації обери «Вчитель» і введи код запрошення (той, що вписаний у
`0004_teacher_invite.sql` замість `werba-teacher-2026`). Код перевіряється в базі, не в
браузері. Щоб змінити — виконай `handle_new_user()` з тієї міграції з новим значенням.

Підняти роль вручну:

```sql
update public.profiles
set role = 'teacher'
where id = (select id from auth.users where email = 'твій-email@example.com');
```

## Деплой

Vercel імпортує репозиторій, у Project Settings → Environment Variables ті самі змінні, що в
`.env.local` (плюс `NOTION_*` і `OPENAI_API_KEY` для тесту poziomującego, пробних іспитів і
перевірки письма), домен — у Project Settings → Domains. `main` деплоїться автоматично,
гілки отримують preview-адресу.
