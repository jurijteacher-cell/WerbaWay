-- Слова учня: які він запам'ятав і скільки разів тренував. Колоди беруться з файлів лекцій.
create table if not exists public.vocab_progress (
  student_id uuid not null references public.profiles(id) on delete cascade,
  lesson_slug text not null,
  word_id text not null,
  known boolean not null default false,
  seen integer not null default 0,
  correct integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (student_id, lesson_slug, word_id)
);

alter table public.vocab_progress enable row level security;

create policy "student manages own vocab_progress" on public.vocab_progress
  for all using (student_id = auth.uid()) with check (student_id = auth.uid());

create policy "teacher reads vocab_progress" on public.vocab_progress
  for select using (public.is_teacher());
