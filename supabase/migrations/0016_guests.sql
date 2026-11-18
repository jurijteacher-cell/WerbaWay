-- ============================================================
-- Werba Way — гість за публічним посиланням /s/<token>
-- Виконати ПІСЛЯ 0014_lecture_shares.sql.
--
-- Гість не має акаунта, тому його «особистість» — кука ww_vid (uuid, 1 рік).
-- Під цим uuid:
--   • guest_visitors — браузер (автопідпис «Гість N», браузер/ОС, коли бачили);
--   • guest_views    — яку лекцію відкривав, скільки разів і скільки часу;
--   • embed_students.visitor_id — рядок для відповідей у вправах (embed_attempts);
--   • канал Realtime guest:<vid> — викладач дивиться екран наживо (як class:<uid>).
-- Після реєстрації claim_guest(vid) переносить усе на акаунт:
-- відповіді, lesson_progress (completed_via='share' — звідси й доступ до лекції).
--
-- Таблиці гість не читає й не пише напряму: лише через функції нижче.
-- ============================================================

create sequence if not exists public.guest_num_seq;

create table if not exists public.guest_visitors (
  id uuid primary key,
  -- номер для автопідпису «Гість 7»
  num integer not null default nextval('public.guest_num_seq'),
  -- короткий рядок від клієнта: «Chrome · Android»
  ua text,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  -- акаунт, на який перенесли цього гостя (одноразово)
  claimed_by uuid references public.profiles(id) on delete set null,
  claimed_at timestamptz
);
create index if not exists guest_visitors_last_seen_idx on public.guest_visitors (last_seen desc);
create index if not exists guest_visitors_claimed_idx on public.guest_visitors (claimed_by) where claimed_by is not null;

create table if not exists public.guest_views (
  visitor_id uuid not null references public.guest_visitors(id) on delete cascade,
  lesson_slug text not null,
  -- яким саме посиланням відкрив
  token text,
  first_at timestamptz not null default now(),
  last_at timestamptz not null default now(),
  opens integer not null default 1,
  -- скільки часу провів у лекції, сума секунд
  seconds integer not null default 0,
  primary key (visitor_id, lesson_slug)
);
create index if not exists guest_views_slug_idx on public.guest_views (lesson_slug, last_at desc);

alter table public.embed_students
  add column if not exists visitor_id uuid unique references public.guest_visitors(id) on delete set null;

alter table public.guest_visitors enable row level security;
alter table public.guest_views enable row level security;

drop policy if exists "guest_visitors: teacher manages" on public.guest_visitors;
create policy "guest_visitors: teacher manages" on public.guest_visitors
  for all using (public.is_teacher()) with check (public.is_teacher());

drop policy if exists "guest_visitors: own after claim" on public.guest_visitors;
create policy "guest_visitors: own after claim" on public.guest_visitors
  for select using (claimed_by = auth.uid());

drop policy if exists "guest_views: teacher manages" on public.guest_views;
create policy "guest_views: teacher manages" on public.guest_views
  for all using (public.is_teacher()) with check (public.is_teacher());

drop policy if exists "guest_views: own after claim" on public.guest_views;
create policy "guest_views: own after claim" on public.guest_views
  for select using (visitor_id in (select id from public.guest_visitors where claimed_by = auth.uid()));

-- ── гість відкрив лекцію / досі в ній ─────────────────────────────────────────
-- Токен обов'язковий: без дійсного посилання гість у базі не з'являється.
-- p_open = true лише при відкритті сторінки, далі — пульс кожні 60 с із p_seconds.
create or replace function public.guest_touch(
  p_vid uuid,
  p_token text,
  p_ua text default null,
  p_seconds integer default 0,
  p_open boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slug text;
  v_num integer;
  v_claimed uuid;
  v_sec integer := greatest(0, least(coalesce(p_seconds, 0), 900));
  v_ua text := left(nullif(trim(coalesce(p_ua, '')), ''), 60);
begin
  if p_vid is null or p_token is null then
    return jsonb_build_object('ok', false);
  end if;
  select lesson_slug into v_slug from lecture_shares where token = p_token and revoked_at is null;
  if v_slug is null then
    return jsonb_build_object('ok', false);
  end if;

  select num, claimed_by into v_num, v_claimed from guest_visitors where id = p_vid;
  if not found then
    -- захист від спаму: не більше 120 нових браузерів за 10 хвилин на весь сайт
    if (select count(*) from guest_visitors where first_seen > now() - interval '10 minutes') >= 120 then
      raise exception 'too many guests';
    end if;
    insert into guest_visitors (id, ua) values (p_vid, v_ua) on conflict (id) do nothing;
    select num, claimed_by into v_num, v_claimed from guest_visitors where id = p_vid;
  else
    update guest_visitors set last_seen = now(), ua = coalesce(ua, v_ua) where id = p_vid;
  end if;

  insert into guest_views (visitor_id, lesson_slug, token, seconds)
  values (p_vid, v_slug, left(p_token, 60), v_sec)
  on conflict (visitor_id, lesson_slug) do update
    set last_at = now(),
        opens = guest_views.opens + (case when p_open then 1 else 0 end),
        seconds = guest_views.seconds + v_sec,
        token = left(p_token, 60);

  return jsonb_build_object('ok', true, 'num', v_num, 'claimed', v_claimed is not null);
end;
$$;

-- рядок гостя для відповідей у вправах; після перенесення на акаунт — null
create or replace function public.guest_embed_student(p_vid uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_num integer;
  v_claimed uuid;
begin
  select num, claimed_by into v_num, v_claimed from guest_visitors where id = p_vid;
  if not found or v_claimed is not null then
    return null;
  end if;
  select id into v_id from embed_students where visitor_id = p_vid;
  if v_id is not null then
    return v_id;
  end if;
  insert into embed_students (visitor_id, name, self_created)
  values (p_vid, 'Гість ' || v_num, true)
  on conflict (visitor_id) do nothing;
  select id into v_id from embed_students where visitor_id = p_vid;
  return v_id;
end;
$$;

-- відповідь гостя у вправі (той самий формат, що embed_record_attempt_me)
create or replace function public.guest_record_attempt(
  p_vid uuid,
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
  v_student uuid := public.guest_embed_student(p_vid);
  v_no int;
begin
  if v_student is null then
    return false;
  end if;
  if p_lesson_id is null or p_lesson_id !~ '^[a-z0-9-]{1,120}$'
     or p_embed is null or p_embed !~ '^[a-z-]{1,30}$'
     or p_item_id is null or length(p_item_id) > 120 then
    return false;
  end if;
  -- стеля на один браузер, щоб анонім не наливав базу
  if (select count(*) from embed_attempts where student_id = v_student) >= 5000 then
    return false;
  end if;

  select count(*) + 1 into v_no from embed_attempts
  where student_id = v_student and lesson_id = p_lesson_id
    and embed = p_embed and item_id = p_item_id;

  insert into embed_attempts (
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

-- ── перенесення гостя на акаунт (після реєстрації або входу) ──────────────────
-- ok | taken | none | auth | teacher
create or replace function public.claim_guest(p_vid uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_claimed uuid;
  v_guest uuid;
  v_mine uuid;
  v_name text;
begin
  if v_uid is null then
    return 'auth';
  end if;
  if p_vid is null then
    return 'none';
  end if;
  -- викладач, що сам відкрив своє посилання, не забирає гостя собі
  if public.is_teacher() then
    return 'teacher';
  end if;

  select claimed_by into v_claimed from guest_visitors where id = p_vid;
  if not found then
    return 'none';
  end if;
  if v_claimed is not null then
    return case when v_claimed = v_uid then 'ok' else 'taken' end;
  end if;

  update guest_visitors set claimed_by = v_uid, claimed_at = now() where id = p_vid;

  -- 1. відповіді у вправах
  select id into v_guest from embed_students where visitor_id = p_vid;
  if v_guest is not null then
    select id into v_mine from embed_students where user_id = v_uid;
    if v_mine is null then
      select nullif(trim(full_name), '') into v_name from profiles where id = v_uid;
      update embed_students set user_id = v_uid, name = coalesce(v_name, name) where id = v_guest;
    else
      update embed_attempts set student_id = v_mine where student_id = v_guest;
      delete from embed_notion_map
        where (kind = 'student' and key = v_guest::text)
           or (kind = 'result' and key like v_guest::text || '|%');
      delete from embed_students where id = v_guest;
    end if;
  end if;

  -- 2. переглянуті лекції → історія учня; звідси ж і доступ (lib/pages/access.ts)
  insert into lesson_progress (student_id, lesson_slug, completed_at, completed_via)
  select v_uid, v.lesson_slug, v.first_at, 'share'
  from guest_views v
  where v.visitor_id = p_vid
  on conflict (student_id, lesson_slug) do nothing;

  return 'ok';
end;
$$;

-- ── приватний канал guest:<vid> ──────────────────────────────────────────────
-- Гість не може довести, хто він (роль anon), тому пропуск — сам uuid: 122 випадкові
-- біти в куці ww_vid. Перевіряємо, що такий браузер існує й був на сайті добу.
create or replace function public.guest_topic_live(p_topic text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_topic is null or left(p_topic, 6) <> 'guest:' then
    return false;
  end if;
  begin
    v_id := substring(p_topic from 7)::uuid;
  exception
    when others then return false;
  end;
  return exists (select 1 from guest_visitors where id = v_id and last_seen > now() - interval '1 day');
end;
$$;

grant execute on function public.guest_touch(uuid, text, text, integer, boolean) to anon, authenticated;
grant execute on function public.guest_record_attempt(uuid, text, text, text, text, text, text, text, text, text, boolean) to anon, authenticated;
grant execute on function public.guest_topic_live(text) to anon, authenticated;
revoke all on function public.guest_embed_student(uuid) from public, anon, authenticated;
revoke all on function public.claim_guest(uuid) from public, anon;
grant execute on function public.claim_guest(uuid) to authenticated;

drop policy if exists "guest channel: receive" on "realtime"."messages";
create policy "guest channel: receive"
on "realtime"."messages"
for select
to anon, authenticated
using (
  (select realtime.topic()) like 'guest:%'
  and realtime.messages.extension in ('broadcast', 'presence')
  and (public.is_teacher() or public.guest_topic_live((select realtime.topic())))
);

drop policy if exists "guest channel: send" on "realtime"."messages";
create policy "guest channel: send"
on "realtime"."messages"
for insert
to anon, authenticated
with check (
  (select realtime.topic()) like 'guest:%'
  and realtime.messages.extension in ('broadcast', 'presence')
  and (public.is_teacher() or public.guest_topic_live((select realtime.topic())))
);

-- викладачеві: гість + його активність одним рядком
create or replace view public.guest_visitor_stats
with (security_invoker = true) as
select
  g.id, g.num, g.ua, g.first_seen, g.last_seen, g.claimed_by, g.claimed_at,
  coalesce(v.views, 0)::int as lectures,
  v.last_at,
  coalesce(v.seconds, 0)::int as seconds,
  coalesce(a.attempts, 0)::int as attempts,
  a.first_total::int as first_total,
  a.first_ok::int as first_ok
from public.guest_visitors g
left join (
  select visitor_id, count(*) as views, max(last_at) as last_at, sum(seconds) as seconds
  from public.guest_views group by visitor_id
) v on v.visitor_id = g.id
left join (
  select s.visitor_id,
         count(t.id) as attempts,
         count(t.id) filter (where t.attempt_no = 1 and t.is_correct is not null) as first_total,
         count(t.id) filter (where t.attempt_no = 1 and t.is_correct) as first_ok
  from public.embed_students s
  left join public.embed_attempts t on t.student_id = s.id
  where s.visitor_id is not null
  group by s.visitor_id
) a on a.visitor_id = g.id;
