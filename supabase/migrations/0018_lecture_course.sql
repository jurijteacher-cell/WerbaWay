-- ============================================================
-- Werba Way — перенесення лекцій між категоріями (курсами)
-- Виконати ПІСЛЯ 0017_lecture_trash.sql (кошик). Можна виконувати повторно.
--
-- Категорія лекції («module» і «moduleTitle») лежить у шапці її файлу в репо. Щоб переносити
-- лекцію з кнопки на сайті, без коміту, зміну зберігаємо тут: рядок перекриває шапку файлу.
-- Видалити рядок = повернути категорію з файлу.
--   module       — код категорії ('' — «Без курсу»); за ним учням відкривають доступ до курсу;
--   module_title — людська назва категорії.
-- Читати можуть усі авторизовані (потрібно учневі, щоб лекція потрапила у правильний курс),
-- змінювати — лише викладач.
-- ============================================================

create table if not exists public.lecture_course (
  slug text primary key,
  module text not null default '',
  module_title text,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

alter table public.lecture_course enable row level security;

drop policy if exists "lecture_course: authenticated read" on public.lecture_course;
create policy "lecture_course: authenticated read" on public.lecture_course
  for select to anon, authenticated using (true);

drop policy if exists "lecture_course: teacher manages" on public.lecture_course;
create policy "lecture_course: teacher manages" on public.lecture_course
  for all to authenticated using (public.is_teacher()) with check (public.is_teacher());

grant select on public.lecture_course to anon, authenticated;
grant insert, update, delete on public.lecture_course to authenticated;
