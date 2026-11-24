-- ============================================================
-- Werba Way — запрошення на дошку: учень сам приймає або відмовляє.
-- Було: викладач додав учня → дошка відкривається силою. Стало: «Викладач запрошує вас на дошку»,
-- бачить дошку лише той, хто прийняв. Відмовився — викладач може запросити знову.
-- Зворотно сумісно: наявні глядачі стають status = 'accepted' (default), нічого в них не змінюється.
-- ============================================================

alter table public.board_viewers
  add column if not exists status text not null default 'accepted'
    check (status in ('invited', 'accepted', 'declined')),
  add column if not exists responded_at timestamptz;

-- дошку й канал board:main бачать лише ті, хто ПРИЙНЯВ запрошення
drop policy if exists "board: viewer reads" on public.teacher_board;
create policy "board: viewer reads" on public.teacher_board for select
  using (exists (
    select 1 from public.board_viewers v
     where v.student_id = (select auth.uid()) and v.status = 'accepted'));

drop policy if exists "board channel: receive" on "realtime"."messages";
create policy "board channel: receive" on "realtime"."messages" for select to authenticated using (
  (select realtime.topic()) = 'board:main' and realtime.messages.extension in ('broadcast','presence')
  and (public.is_teacher() or exists (
    select 1 from public.board_viewers v
     where v.student_id = (select auth.uid()) and v.status = 'accepted')));

drop policy if exists "board channel: send" on "realtime"."messages";
create policy "board channel: send" on "realtime"."messages" for insert to authenticated with check (
  (select realtime.topic()) = 'board:main' and (
    public.is_teacher()
    or (realtime.messages.extension = 'presence'
        and exists (
          select 1 from public.board_viewers v
           where v.student_id = (select auth.uid()) and v.status = 'accepted'))));

-- відповідь учня: прийняти можна лише запрошення; відмовитись — і від запрошення, і від уже прийнятої дошки.
-- Повертає новий статус ('none', якщо запрошення немає — наприклад, викладач уже його скасував).
create or replace function public.respond_board_invite(p_accept boolean)
returns text language plpgsql security definer set search_path = public as $$
declare
  cur text;
begin
  select status into cur from public.board_viewers where student_id = auth.uid();
  if cur is null then
    return 'none';
  end if;
  if p_accept and cur <> 'invited' then
    return cur;
  end if;
  update public.board_viewers
     set status = case when p_accept then 'accepted' else 'declined' end,
         responded_at = now()
   where student_id = auth.uid();
  return case when p_accept then 'accepted' else 'declined' end;
end;
$$;
revoke all on function public.respond_board_invite(boolean) from public, anon;
grant execute on function public.respond_board_invite(boolean) to authenticated;
