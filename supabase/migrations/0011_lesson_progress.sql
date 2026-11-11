-- Історія лекцій учня + автоматична домашка.
-- Рядок з'являється, коли викладач завершує лекцію в класі; тоді ж задається домашка.
create table if not exists public.lesson_progress (
  student_id uuid not null references public.profiles(id) on delete cascade,
  lesson_slug text not null,
  completed_at timestamptz not null default now(),
  completed_via text not null default 'class',
  homework_assigned_at timestamptz,
  homework_done_at timestamptz,
  primary key (student_id, lesson_slug)
);

alter table public.lesson_progress enable row level security;

create policy "teacher manages lesson_progress" on public.lesson_progress
  for all using (public.is_teacher()) with check (public.is_teacher());

create policy "student reads own lesson_progress" on public.lesson_progress
  for select using (student_id = auth.uid());

-- Учень сам може лише позначити домашку виконаною (інші колонки змінювати не може).
create or replace function public.mark_homework_done(p_slug text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.lesson_progress
     set homework_done_at = coalesce(homework_done_at, now())
   where student_id = auth.uid()
     and lesson_slug = p_slug
     and homework_assigned_at is not null;
  if not found then
    raise exception 'homework not assigned';
  end if;
end;
$$;

revoke all on function public.mark_homework_done(text) from public, anon;
grant execute on function public.mark_homework_done(text) to authenticated;
