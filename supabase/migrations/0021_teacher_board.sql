-- ============================================================
-- Werba Way — дошка викладача: одна на всіх, живе, доки викладач не натисне «Очистити».
-- Глядачів додає викладач вручну; вони лише дивляться. Живі зміни — Realtime-канал board:main.
-- ============================================================

create table if not exists public.teacher_board (
  id          int primary key default 1 check (id = 1),   -- рівно одна дошка
  els         jsonb not null default '[]',                -- BoardEl[]
  vp          jsonb,                                      -- в'юпорт викладача («Вести за мною»)
  follow      boolean not null default true,
  rev         bigint not null default 0,
  updated_at  timestamptz not null default now()
);
insert into public.teacher_board (id) values (1) on conflict do nothing;

create table if not exists public.board_viewers (
  student_id  uuid primary key references public.profiles(id) on delete cascade,
  added_at    timestamptz not null default now()
);

alter table public.teacher_board enable row level security;
alter table public.board_viewers enable row level security;

create policy "board: teacher all" on public.teacher_board for all
  using (public.is_teacher()) with check (public.is_teacher());
create policy "board: viewer reads" on public.teacher_board for select
  using (exists (select 1 from public.board_viewers v where v.student_id = (select auth.uid())));
create policy "viewers: teacher all" on public.board_viewers for all
  using (public.is_teacher()) with check (public.is_teacher());
create policy "viewers: self reads" on public.board_viewers for select
  using (student_id = (select auth.uid()));

-- канал board:main: слухають викладач і поточні глядачі; пише лише викладач (глядач — тільки присутність)
create policy "board channel: receive" on "realtime"."messages" for select to authenticated using (
  (select realtime.topic()) = 'board:main' and realtime.messages.extension in ('broadcast','presence')
  and (public.is_teacher() or exists (select 1 from public.board_viewers v where v.student_id = (select auth.uid()))));
create policy "board channel: send" on "realtime"."messages" for insert to authenticated with check (
  (select realtime.topic()) = 'board:main' and (
    public.is_teacher()
    or (realtime.messages.extension = 'presence'
        and exists (select 1 from public.board_viewers v where v.student_id = (select auth.uid())))));
