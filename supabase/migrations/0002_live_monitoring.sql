-- ============================================================
-- Werba Way — жива трансляція вправ + ручне редагування вчителем
-- Виконати ПІСЛЯ 0001_init.sql у Supabase SQL Editor
-- ============================================================

-- Позначка: цю відповідь востаннє змінив вчитель (не сам учень).
-- Потрібна, щоб відрізняти "учень відповів правильно" від
-- "вчитель виправив за учня" у статистиці й в UI.
alter table public.submissions
  add column if not exists edited_by_teacher boolean not null default false;

-- ── Приватні Realtime-канали для живих чернеток відповідей ──
--
-- Топік каналу завжди має вигляд 'lesson-draft-<slug-уроку>'.
-- Учні можуть ТІЛЬКИ надсилати (broadcast) свою чернетку в цей канал.
-- Слухати (отримувати) канал може ТІЛЬКИ вчитель — це не дає учням
-- підглядати чернетки одне одного.
--
-- ВАЖЛИВО: ці політики працюють лише якщо в Supabase Dashboard →
-- Project Settings → Realtime вимкнено "Allow public access"
-- (інакше публічні канали обходять RLS взагалі). Це налаштування
-- не робиться через SQL — зроби його руками один раз.

create policy "students can broadcast lesson drafts"
on "realtime"."messages"
for insert
to authenticated
with check (
  (select realtime.topic()) like 'lesson-draft-%'
  and realtime.messages.extension = 'broadcast'
);

create policy "only teachers can receive lesson drafts"
on "realtime"."messages"
for select
to authenticated
using (
  (select realtime.topic()) like 'lesson-draft-%'
  and realtime.messages.extension = 'broadcast'
  and public.is_teacher()
);
