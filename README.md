# Werba Way — платформа уроків

MVP: учень реєструється, заходить, проходить урок і виконує вправи 5 типів
(множинний вибір, заповнити пропуск, зіставлення пар, відкрита відповідь,
аудіювання). Об'єктивні типи перевіряються автоматично на сервері, відкриту
відповідь перевіряєш ти в кабінеті вчителя `/teacher`.

## Стек
Next.js 14 (App Router) + TypeScript + Tailwind + Supabase (Auth + Postgres + RLS) + Vercel.

## Як контент потрапляє на сайт
Уроки й вправи — це TypeScript-файли в `src/content/lessons/`, не база даних
і не CMS. Щоб додати урок: скопіюй `lesson-1-hello.ts`, зміни вміст, додай
імпорт у `src/content/lessons/index.ts`. Це навмисне рішення: ти попросив
контент через код, і це найшвидший спосіб для мене редагувати уроки на
твій запит.

## Запуск локально

1. `npm install`
2. Створи проєкт на [supabase.com](https://supabase.com), якщо ще нема.
3. У Supabase Dashboard → SQL Editor виконай вміст `supabase/migrations/0001_init.sql`.
4. Скопіюй `.env.local.example` → `.env.local`, встав `Project URL` і `anon public key`
   зі Supabase Dashboard → Project Settings → API.
5. `npm run dev` → відкрий http://localhost:3000

## Як стати вчителем

Реєстрація завжди створює учня (це навмисне обмеження безпеки — інакше будь-хто
міг би зареєструватись як вчитель і бачити відповіді всіх учнів). Щоб зробити
себе вчителем:

1. Зареєструйся звичайним чином на сайті.
2. У Supabase Dashboard → SQL Editor виконай (заміни email):

```sql
update public.profiles
set role = 'teacher'
where id = (select id from auth.users where email = 'твій-email@example.com');
```

3. Перейди на `/teacher`.

## Деплой

1. Заведи GitHub-репозиторій, запуш цей код.
2. На [vercel.com](https://vercel.com) → New Project → імпортуй репозиторій.
3. У Vercel Project Settings → Environment Variables додай ті самі дві змінні
   з `.env.local`.
4. Прив'яжи свій домен у Vercel → Project Settings → Domains.

## Свідомі спрощення MVP (наступні кроки, коли скажеш)
- Немає груп/призначення конкретних уроків конкретним учням — поки що всі
  учні бачать усі уроки зі списку.
- Сторінка вправи не показує раніше надіслану відповідь при перезаході —
  можна повторно відповісти, старий запис перезаписується.
- Аудіо-файл у прикладі — заглушка (`/audio/placeholder.mp3`), треба залити
  реальний файл у `public/audio/` або в Supabase Storage.
- Нема адмін-панелі для контенту без коду — свідомо, за твоїм вибором.
