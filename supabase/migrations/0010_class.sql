-- ============================================================
-- Werba Way — «Клас»: живе заняття викладача з учнем онлайн
-- Одна кімната на учня. Канал Realtime: class:<uid учня>.
--   • учень надсилає запис свого екрана (rrweb) і присутність;
--   • викладач надсилає команди (перейти до уроку, клік, ввід).
-- Канал бачить лише викладач і сам цей учень.
-- ============================================================

create table if not exists public.class_rooms (
  student_id uuid primary key references public.profiles(id) on delete cascade,
  -- false = учень у залі очікування, true = викладач перевів його в клас
  active     boolean not null default false,
  lesson_id  text,
  -- grammar | vocab | hw | comm-tasks | exam | notes | slides …
  embed      text,
  -- діапазон блоків граматики, напр. g2-g5 (як ?blocks= в embed)
  blocks     text,
  updated_at timestamptz not null default now()
);

alter table public.class_rooms enable row level security;

create policy "class_rooms: teacher manages"
  on public.class_rooms for all
  using (public.is_teacher())
  with check (public.is_teacher());

create policy "class_rooms: student reads own"
  on public.class_rooms for select
  using (auth.uid() = student_id);

-- ── Приватні канали class:<uid> ──
-- Слухати й писати може викладач (будь-який клас) і учень (лише свій).
-- Потрібно, щоб у Supabase → Realtime Settings було вимкнено «Allow public access»
-- (уже зроблено для lesson-draft-*).
create policy "class channel: receive"
on "realtime"."messages"
for select
to authenticated
using (
  (select realtime.topic()) like 'class:%'
  and realtime.messages.extension in ('broadcast', 'presence')
  and (
    public.is_teacher()
    or (select realtime.topic()) = 'class:' || auth.uid()::text
  )
);

create policy "class channel: send"
on "realtime"."messages"
for insert
to authenticated
with check (
  (select realtime.topic()) like 'class:%'
  and realtime.messages.extension in ('broadcast', 'presence')
  and (
    public.is_teacher()
    or (select realtime.topic()) = 'class:' || auth.uid()::text
  )
);
