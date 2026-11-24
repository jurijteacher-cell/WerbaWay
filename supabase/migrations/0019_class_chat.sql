-- ============================================================
-- Werba Way — чат викладач ↔ учень + приватні канали dock:<uid>
-- Кімната = учень (student_id). Час ставить сервер. Доставка — Realtime broadcast
-- у каналі dock:<uid учня>; історія — з цієї таблиці.
-- ============================================================

create table if not exists public.class_messages (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null references public.profiles(id) on delete cascade,
  sender_id    uuid not null references public.profiles(id) on delete cascade,
  sender_role  text not null check (sender_role in ('teacher','student')),
  kind         text not null default 'text' check (kind in ('text','word','board','system')),
  body         text not null check (char_length(body) between 1 and 2000),
  meta         jsonb,
  lesson_slug  text,
  page_idx     int,
  created_at   timestamptz not null default now(),
  read_at      timestamptz,
  deleted_at   timestamptz
);
create index if not exists class_messages_room_idx on public.class_messages (student_id, created_at desc);
create index if not exists class_messages_unread_idx on public.class_messages (sender_role, read_at) where read_at is null;
-- FK-індекс на відправника (on delete cascade)
create index if not exists class_messages_sender_idx on public.class_messages (sender_id);

alter table public.class_messages enable row level security;

create policy "chat: teacher all" on public.class_messages for all
  using (public.is_teacher()) with check (public.is_teacher());
create policy "chat: student reads own" on public.class_messages for select
  using (student_id = (select auth.uid()));
create policy "chat: student writes own text" on public.class_messages for insert
  with check (student_id = (select auth.uid()) and sender_id = (select auth.uid())
              and sender_role = 'student' and kind = 'text');

-- учень відмічає прочитаними повідомлення викладача у своїй кімнаті
create or replace function public.mark_chat_read()
returns void language sql security definer set search_path = public as $$
  update public.class_messages
     set read_at = now()
   where student_id = auth.uid() and sender_role = 'teacher' and read_at is null;
$$;
revoke all on function public.mark_chat_read() from public, anon;
grant execute on function public.mark_chat_read() to authenticated;

-- ── Приватні канали dock:<uid> (чат, слова, запрошення на дошку) ──
create policy "dock channel: receive" on "realtime"."messages" for select to authenticated using (
  (select realtime.topic()) like 'dock:%' and realtime.messages.extension in ('broadcast','presence')
  and (public.is_teacher() or (select realtime.topic()) = 'dock:' || (select auth.uid())::text));
create policy "dock channel: send" on "realtime"."messages" for insert to authenticated with check (
  (select realtime.topic()) like 'dock:%' and realtime.messages.extension in ('broadcast','presence')
  and (public.is_teacher() or (select realtime.topic()) = 'dock:' || (select auth.uid())::text));
