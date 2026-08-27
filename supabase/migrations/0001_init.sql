-- ============================================================
-- Werba Way — початкова схема БД
-- Виконати в Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

-- Профіль користувача (учень/вчитель), 1:1 з auth.users
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'student' check (role in ('student', 'teacher')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Допоміжна функція: чи є поточний користувач вчителем.
-- security definer — щоб уникнути рекурсії RLS (політика на profiles не може
-- сама себе запитувати без цього).
create or replace function public.is_teacher()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'teacher'
  );
$$;

create policy "profiles: own row or teacher sees all"
  on public.profiles for select
  using (auth.uid() = id or public.is_teacher());

create policy "profiles: update own row"
  on public.profiles for update
  using (auth.uid() = id);

-- Автоматично створює профіль при реєстрації нового користувача.
-- Роль завжди 'student' за замовчуванням — це навмисно (див. README,
-- "Як стати вчителем").
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Відповіді учнів на вправи.
-- Контент вправ (питання, правильні відповіді) живе в коді (src/content),
-- тут зберігається лише те, що не можна тримати в коді: хто, що і коли відповів.
create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  lesson_slug text not null,
  exercise_id text not null,
  exercise_type text not null,
  answer jsonb not null,
  is_correct boolean,
  auto_graded boolean not null default false,
  teacher_feedback text,
  submitted_at timestamptz not null default now(),
  graded_at timestamptz,
  unique (student_id, lesson_slug, exercise_id)
);

alter table public.submissions enable row level security;

create policy "submissions: student reads own, teacher reads all"
  on public.submissions for select
  using (auth.uid() = student_id or public.is_teacher());

create policy "submissions: student inserts own"
  on public.submissions for insert
  with check (auth.uid() = student_id);

create policy "submissions: student updates own, teacher updates any (grading)"
  on public.submissions for update
  using (auth.uid() = student_id or public.is_teacher());

create index if not exists submissions_lesson_idx on public.submissions (lesson_slug);
create index if not exists submissions_student_idx on public.submissions (student_id);
