-- Доступ учня до лекцій на сайті: цілим курсом (модулем, як у Notion) або окремою лекцією.
create table if not exists public.student_access (
  student_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('module', 'lesson')),
  ref text not null,
  granted_by uuid references public.profiles(id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (student_id, kind, ref)
);

alter table public.student_access enable row level security;

create policy "teacher manages student_access" on public.student_access
  for all using (public.is_teacher()) with check (public.is_teacher());

create policy "student reads own student_access" on public.student_access
  for select using (student_id = auth.uid());
