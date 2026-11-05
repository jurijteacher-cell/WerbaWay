-- ============================================================
-- Werba Way — результати вправ з ембедів у Notion (без логіну)
-- Виконати ПІСЛЯ 0001–0004: Supabase Dashboard → SQL Editor → New query → Run
--
-- Ідея: ембед у Notion — це iframe, cookie логіну там ненадійні.
-- Тому учень один раз вводить свій короткий код (або код є в посиланні ?s=КОД),
-- і кожна перевірка «Sprawdź» записується на нього.
--
-- Учень (anon) не читає жодної таблиці напряму. Він може лише:
--   embed_student_name(code)       → ім'я, якщо код існує (щоб показати «Cześć, Anna»)
--   embed_record_attempt(code, …)  → дописати спробу
-- Читає й керує учнями лише викладач (is_teacher()).
-- ============================================================

create table if not exists public.embed_students (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9]{4,12}$'),
  name text not null check (length(trim(name)) between 1 and 80),
  note text,
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists public.embed_attempts (
  id bigint generated always as identity primary key,
  student_id uuid not null references public.embed_students(id) on delete cascade,
  lesson_id text not null,
  embed text not null,          -- grammar / hw / exam / grammar-board
  block_id text,                -- рівень або блок (g2, e1…)
  item_id text not null,
  item_type text,               -- fill-in-blank, matching, sentence-building, true-false, open-answer, writing…
  grammar_point text,
  prompt text,                  -- текст завдання, щоб у кабінеті було видно, про що питання
  answer text,                  -- що відповів учень
  expected text,                -- правильна відповідь (null для вільного письма)
  is_correct boolean,           -- null = відкрита відповідь, оцінює викладач
  attempt_no int not null,
  created_at timestamptz not null default now()
);

create index if not exists embed_attempts_student_idx
  on public.embed_attempts (student_id, created_at desc);
create index if not exists embed_attempts_item_idx
  on public.embed_attempts (student_id, lesson_id, embed, item_id);

alter table public.embed_students enable row level security;
alter table public.embed_attempts enable row level security;

drop policy if exists "embed_students: teacher all" on public.embed_students;
create policy "embed_students: teacher all"
  on public.embed_students for all
  using (public.is_teacher())
  with check (public.is_teacher());

drop policy if exists "embed_attempts: teacher reads" on public.embed_attempts;
create policy "embed_attempts: teacher reads"
  on public.embed_attempts for select
  using (public.is_teacher());

drop policy if exists "embed_attempts: teacher deletes" on public.embed_attempts;
create policy "embed_attempts: teacher deletes"
  on public.embed_attempts for delete
  using (public.is_teacher());

-- Ім'я учня за кодом (для привітання в ембеді). Нічого більше не віддає.
create or replace function public.embed_student_name(p_code text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select name from public.embed_students
  where code = upper(trim(p_code)) and archived_at is null;
$$;

-- Запис однієї спроби. Невідомий або архівний код → false, нічого не пишеться.
create or replace function public.embed_record_attempt(
  p_code text,
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
  v_student uuid;
  v_no int;
begin
  select id into v_student from public.embed_students
  where code = upper(trim(p_code)) and archived_at is null;
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

revoke all on function public.embed_student_name(text) from public;
revoke all on function public.embed_record_attempt(text, text, text, text, text, text, text, text, text, text, boolean) from public;
grant execute on function public.embed_student_name(text) to anon, authenticated;
grant execute on function public.embed_record_attempt(text, text, text, text, text, text, text, text, text, text, boolean) to anon, authenticated;

-- Зведення по учню для списку в кабінеті (RLS таблиць діє через security_invoker)
create or replace view public.embed_student_stats
with (security_invoker = true) as
select
  s.id, s.code, s.name, s.note, s.created_at, s.archived_at,
  count(a.id)::int as attempts,
  count(a.id) filter (where a.attempt_no = 1 and a.is_correct is not null)::int as first_total,
  count(a.id) filter (where a.attempt_no = 1 and a.is_correct)::int as first_ok,
  count(a.id) filter (where a.is_correct is null)::int as open_answers,
  count(distinct a.lesson_id)::int as lessons,
  max(a.created_at) as last_at
from public.embed_students s
left join public.embed_attempts a on a.student_id = s.id
group by s.id;
