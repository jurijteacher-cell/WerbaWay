-- ============================================================
-- Werba Way — лекції: призначення учню + приватний канал
-- Виконати ПІСЛЯ 0001_init.sql і 0002_live_monitoring.sql
-- ============================================================

-- Призначення: яку лекцію (за slug з коду, не таблиця) вчитель дав учню.
-- Це НЕ система прав доступу (учень і без призначення може відкрити будь-яку
-- лекцію — так само, як зараз працюють уроки). Призначення — це "позначка",
-- яка показує учню "тобі задано" на сторінці /lectures і показує вчителю
-- список учнів у /teacher/live/lectures/[slug], навіть якщо вони ще нічого
-- не робили.
create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  lecture_slug text not null,
  student_id uuid not null references public.profiles(id) on delete cascade,
  assigned_by uuid references public.profiles(id) on delete set null,
  assigned_at timestamptz not null default now(),
  unique (lecture_slug, student_id)
);

alter table public.assignments enable row level security;

create policy "assignments: student reads own, teacher reads all"
  on public.assignments for select
  using (auth.uid() = student_id or public.is_teacher());

create policy "assignments: only teacher assigns"
  on public.assignments for insert
  with check (public.is_teacher());

create policy "assignments: only teacher removes"
  on public.assignments for delete
  using (public.is_teacher());

create index if not exists assignments_student_idx on public.assignments (student_id);
create index if not exists assignments_lecture_idx on public.assignments (lecture_slug);

-- Приватний канал лекції: топік вигляду 'lecture-draft-<slug-лекції>'.
-- Той самий принцип, що й для уроків у 0002: учні тільки надсилають
-- (чернетки відповідей + позицію — яку вправу зараз дивляться), слухати
-- може тільки вчитель.
create policy "students can broadcast lecture drafts"
on "realtime"."messages"
for insert
to authenticated
with check (
  (select realtime.topic()) like 'lecture-draft-%'
  and realtime.messages.extension = 'broadcast'
);

create policy "only teachers can receive lecture drafts"
on "realtime"."messages"
for select
to authenticated
using (
  (select realtime.topic()) like 'lecture-draft-%'
  and realtime.messages.extension = 'broadcast'
  and public.is_teacher()
);
