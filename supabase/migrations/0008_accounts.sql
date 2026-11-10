-- ============================================================
-- Werba Way — акаунти замість кодів
-- Виконати ПІСЛЯ 0001–0007.
--
-- 1. Закриває діру: будь-який користувач міг оновити власний profiles.role на 'teacher'
--    (політика "update own row" без обмеження колонок). Тепер роль міняє лише викладач
--    або SQL-редактор (auth.uid() is null).
-- 2. Реєстрація завжди створює учня. Код запрошення вчителя більше не перевіряється:
--    вчителя призначає викладач через public.set_role(email, role) або SQL.
-- 3. embed_students отримує user_id — рядок учня прив'язується до акаунта.
--    code стає необов'язковим (новим учням код не потрібен).
-- 4. Нові RPC для залогіненого учня: embed_me(), embed_record_attempt_me(...),
--    embed_claim_code(code) — одноразове перенесення історії зі старого коду.
-- 5. mock_results — результати пробних іспитів для аналітики в дашборді.
-- (Самостійне створення кодів вимикає 0009 — після деплою нового фронтенду.)
-- ============================================================

-- 1. role protection ----------------------------------------------------------
create or replace function public.profiles_protect_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and auth.uid() is not null
     and not public.is_teacher() then
    raise exception 'Only a teacher can change a role';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_role on public.profiles;
create trigger profiles_protect_role
  before update on public.profiles
  for each row execute function public.profiles_protect_role();

-- 2. registration always creates a student ------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_first text := nullif(trim(new.raw_user_meta_data->>'first_name'), '');
  v_last  text := nullif(trim(new.raw_user_meta_data->>'last_name'), '');
begin
  insert into public.profiles (id, full_name, first_name, last_name, role)
  values (
    new.id,
    nullif(trim(coalesce(v_first, '') || ' ' || coalesce(v_last, '')), ''),
    v_first,
    v_last,
    'student'
  );
  return new;
end;
$$;

-- teacher assigns roles by e-mail (also callable from the SQL editor)
create or replace function public.set_role(p_email text, p_role text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if auth.uid() is not null and not public.is_teacher() then
    raise exception 'Only a teacher can change a role';
  end if;
  if p_role not in ('student', 'teacher') then
    raise exception 'bad role';
  end if;
  select id into v_id from auth.users where lower(email) = lower(trim(p_email));
  if v_id is null then
    return false;
  end if;
  update public.profiles set role = p_role where id = v_id;
  return found;
end;
$$;
revoke all on function public.set_role(text, text) from public, anon;
grant execute on function public.set_role(text, text) to authenticated;

-- 3. embed_students ↔ account ---------------------------------------------------
alter table public.embed_students
  add column if not exists user_id uuid unique references auth.users(id) on delete set null;
alter table public.embed_students alter column code drop not null;

drop policy if exists "embed_students: own row" on public.embed_students;
create policy "embed_students: own row"
  on public.embed_students for select
  using (user_id = auth.uid());

drop policy if exists "embed_attempts: own reads" on public.embed_attempts;
create policy "embed_attempts: own reads"
  on public.embed_attempts for select
  using (student_id in (select id from public.embed_students where user_id = auth.uid()));

-- the student row of the logged-in user (created on first use)
create or replace function public.embed_student_id_for_me()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_name text;
begin
  if v_uid is null then
    return null;
  end if;
  select id into v_id from public.embed_students where user_id = v_uid;
  if v_id is not null then
    return v_id;
  end if;
  select nullif(trim(full_name), '') into v_name from public.profiles where id = v_uid;
  if v_name is null then
    select split_part(email, '@', 1) into v_name from auth.users where id = v_uid;
  end if;
  insert into public.embed_students (user_id, name)
  values (v_uid, left(coalesce(nullif(trim(v_name), ''), 'Uczeń'), 80))
  on conflict (user_id) do nothing;
  select id into v_id from public.embed_students where user_id = v_uid;
  return v_id;
end;
$$;

create or replace function public.embed_me()
returns table (student_id uuid, name text, code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid := public.embed_student_id_for_me();
begin
  if v_id is null then
    return;
  end if;
  return query select s.id, s.name, s.code from public.embed_students s where s.id = v_id;
end;
$$;

create or replace function public.embed_record_attempt_me(
  p_lesson_id text,
  p_embed text,
  p_block_id text,
  p_item_id text,
  p_item_type text,
  p_grammar_point text,
  p_prompt text,
  p_answer text,
  p_expected text,
  p_is_correct boolean
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student uuid := public.embed_student_id_for_me();
  v_no int;
begin
  if v_student is null then
    return false;
  end if;
  if p_lesson_id is null or p_lesson_id !~ '^[a-z0-9-]{1,120}$'
     or p_embed is null or p_embed !~ '^[a-z-]{1,30}$'
     or p_item_id is null or length(p_item_id) > 120 then
    return false;
  end if;

  select count(*) + 1 into v_no from public.embed_attempts
  where student_id = v_student and lesson_id = p_lesson_id
    and embed = p_embed and item_id = p_item_id;

  insert into public.embed_attempts (
    student_id, lesson_id, embed, block_id, item_id, item_type, grammar_point,
    prompt, answer, expected, is_correct, attempt_no
  ) values (
    v_student, p_lesson_id, p_embed, left(p_block_id, 60), p_item_id, left(p_item_type, 40),
    left(p_grammar_point, 80), left(p_prompt, 1000), left(p_answer, 6000),
    left(p_expected, 1000), p_is_correct, v_no
  );
  return true;
end;
$$;

-- one-time move of a legacy code's history onto the logged-in account.
-- returns: ok | not_found | taken | auth
create or replace function public.embed_claim_code(p_code text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_old uuid;
  v_old_user uuid;
  v_new uuid;
begin
  if v_uid is null then
    return 'auth';
  end if;
  select id, user_id into v_old, v_old_user
  from public.embed_students
  where code = upper(trim(p_code)) and archived_at is null;
  if v_old is null then
    return 'not_found';
  end if;
  if v_old_user is not null then
    return case when v_old_user = v_uid then 'ok' else 'taken' end;
  end if;

  -- a fresh account row may already exist: fold its attempts into the legacy row
  select id into v_new from public.embed_students where user_id = v_uid;
  if v_new is not null then
    update public.embed_attempts set student_id = v_old where student_id = v_new;
    delete from public.embed_notion_map
      where (kind = 'student' and key = v_new::text)
         or (kind = 'result' and key like v_new::text || '|%');
    delete from public.embed_students where id = v_new;
  end if;
  update public.embed_students set user_id = v_uid where id = v_old;
  return 'ok';
end;
$$;

revoke all on function public.embed_student_id_for_me() from public, anon, authenticated;
revoke all on function public.embed_me() from public, anon;
revoke all on function public.embed_record_attempt_me(text, text, text, text, text, text, text, text, text, boolean) from public, anon;
revoke all on function public.embed_claim_code(text) from public, anon;
grant execute on function public.embed_me() to authenticated;
grant execute on function public.embed_record_attempt_me(text, text, text, text, text, text, text, text, text, boolean) to authenticated;
grant execute on function public.embed_claim_code(text) to authenticated;

-- stats view: new column at the end (user_id)
create or replace view public.embed_student_stats
with (security_invoker = true) as
select
  s.id, s.code, s.name, s.note, s.created_at, s.archived_at,
  count(a.id)::int as attempts,
  count(a.id) filter (where a.attempt_no = 1 and a.is_correct is not null)::int as first_total,
  count(a.id) filter (where a.attempt_no = 1 and a.is_correct)::int as first_ok,
  count(a.id) filter (where a.is_correct is null)::int as open_answers,
  count(distinct a.lesson_id)::int as lessons,
  max(a.created_at) as last_at,
  s.self_created,
  s.user_id
from public.embed_students s
left join public.embed_attempts a on a.student_id = s.id
group by s.id;

-- 5. mock exam results ---------------------------------------------------------
create table if not exists public.mock_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id text not null check (lesson_id ~ '^[a-z0-9-]{1,120}$'),
  exam_label text,
  scoring text,
  total numeric not null,
  max_total numeric not null,
  level text,
  passed boolean,
  minutes numeric,
  score jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists mock_results_user_idx on public.mock_results (user_id, created_at desc);
alter table public.mock_results enable row level security;

drop policy if exists "mock_results: own or teacher reads" on public.mock_results;
create policy "mock_results: own or teacher reads"
  on public.mock_results for select
  using (user_id = auth.uid() or public.is_teacher());

drop policy if exists "mock_results: insert own" on public.mock_results;
create policy "mock_results: insert own"
  on public.mock_results for insert
  with check (user_id = auth.uid());

drop policy if exists "mock_results: teacher deletes" on public.mock_results;
create policy "mock_results: teacher deletes"
  on public.mock_results for delete
  using (public.is_teacher());
