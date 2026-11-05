-- ============================================================
-- Werba Way — учень сам створює собі код у ембеді (без викладача)
-- Виконати ПІСЛЯ 0005_embed_results.sql
--
-- embed_create_student(name, code) → true, якщо код вільний і створений.
-- Код генерує сайт (ім'я + 2 цифри), функція лише перевіряє формат і вставляє.
-- Захист від спаму: не більше 30 самостійних реєстрацій за 10 хвилин на весь сайт.
-- ============================================================

alter table public.embed_students
  add column if not exists self_created boolean not null default false;

create or replace function public.embed_create_student(p_name text, p_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := left(trim(coalesce(p_name, '')), 80);
  v_code text := upper(trim(coalesce(p_code, '')));
begin
  if length(v_name) < 1 or v_code !~ '^[A-Z]{1,5}[2-9]{2}$' then
    return false;
  end if;
  if (select count(*) from public.embed_students
      where self_created and created_at > now() - interval '10 minutes') >= 30 then
    raise exception 'too many signups';
  end if;
  insert into public.embed_students (code, name, self_created)
  values (v_code, v_name, true)
  on conflict (code) do nothing;
  return found;
end;
$$;

grant execute on function public.embed_create_student(text, text) to anon, authenticated;

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
  s.self_created
from public.embed_students s
left join public.embed_attempts a on a.student_id = s.id
group by s.id;
