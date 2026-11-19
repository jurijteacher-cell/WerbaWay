-- ============================================================
-- Werba Way — кошик лекцій
-- Виконати ПІСЛЯ 0016_guests.sql.
--
-- Лекції — це файли в репо (src/content/pages/<slug>.md), тож «видалити» з сайту
-- означає два кроки:
--   1) у кошик: рядок тут (purged_at = null) — лекцію не бачить ніхто, крім викладача
--      на сторінці /teacher/trash; «Відновити» просто видаляє рядок;
--   2) назавжди: purged_at + file_hash (sha256 файлу лекції на момент видалення).
--      GitHub Action .github/workflows/purge-lectures.yml за розкладом читає
--      /api/lectures/purged і видаляє файли лекції з репо (scripts/purge-lectures.mjs).
--      Поки файли ще є, лекцію приховано; якщо колись опублікують нову лекцію з тим самим
--      slug, її хеш інший — і вона з'явиться як звичайна.
--
-- Читати можуть усі (лише slug і дати — потрібно і гостю за /s/<token>, і GitHub Action),
-- змінювати — лише викладач.
-- ============================================================

create table if not exists public.lecture_trash (
  slug text primary key,
  deleted_at timestamptz not null default now(),
  deleted_by uuid references public.profiles(id) on delete set null,
  purged_at timestamptz,
  file_hash text
);

alter table public.lecture_trash enable row level security;

drop policy if exists "lecture_trash: everyone reads" on public.lecture_trash;
create policy "lecture_trash: everyone reads" on public.lecture_trash
  for select to anon, authenticated using (true);

drop policy if exists "lecture_trash: teacher manages" on public.lecture_trash;
create policy "lecture_trash: teacher manages" on public.lecture_trash
  for all to authenticated using (public.is_teacher()) with check (public.is_teacher());

grant select on public.lecture_trash to anon, authenticated;
grant insert, update, delete on public.lecture_trash to authenticated;
