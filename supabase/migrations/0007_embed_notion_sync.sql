-- ============================================================
-- Werba Way — автоматичне винесення учнів і результатів у Notion
-- Виконати ПІСЛЯ 0006. Потрібні розширення pg_cron і pg_net.
--
-- Як працює:
--   pg_cron кожні 5 хв → embed_sync_kick() → якщо є нове, створює одноразову
--   «партію» (uuid) і через pg_net кличе https://werba-way.vercel.app/api/embed/notion-sync
--   {batch}. Сайт викликає embed_sync_fetch(batch) → отримує змінене, пише в Notion
--   (NOTION_API_KEY уже є на Vercel) → embed_sync_save(batch, …) запам'ятовує сторінки.
--   Партія діє 15 хв і віддає дані лише раз — знати її uuid може тільки сайт.
--   Раз на добу kick(true) кличе сайт навіть без змін, щоб база не засинала.
-- ============================================================

create extension if not exists pg_net;
create extension if not exists pg_cron;

alter table public.embed_students
  add column if not exists updated_at timestamptz not null default now();

create or replace function public.embed_students_touch()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger embed_students_touch
  before update on public.embed_students
  for each row execute function public.embed_students_touch();

-- Яка сторінка Notion відповідає учню / результату і до якого моменту вона актуальна
create table if not exists public.embed_notion_map (
  kind text not null check (kind in ('student', 'result')),
  key text not null,            -- student: student_id; result: student_id|lesson_id|embed
  notion_page_id text not null,
  detail_block_id text,         -- блок з деталями на сторінці результату (замінюється цілим)
  synced_upto timestamptz not null,
  primary key (kind, key)
);
alter table public.embed_notion_map enable row level security;

create table if not exists public.embed_sync_batches (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  fetched_at timestamptz
);
alter table public.embed_sync_batches enable row level security;
-- RLS без політик: читати/писати ці дві таблиці можуть лише функції нижче.

create or replace function public.embed_sync_kick(p_force boolean default false)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  delete from public.embed_sync_batches where created_at < now() - interval '1 day';

  -- не накладати партії: попередня ще не забрана й свіжа
  if exists (select 1 from public.embed_sync_batches
             where fetched_at is null and created_at > now() - interval '4 minutes') then
    return false;
  end if;

  if not p_force and not exists (
    select 1
    from (select student_id, lesson_id, embed, max(created_at) as last_at
          from public.embed_attempts group by 1, 2, 3) g
    left join public.embed_notion_map m
      on m.kind = 'result' and m.key = g.student_id || '|' || g.lesson_id || '|' || g.embed
    where m.synced_upto is null or g.last_at > m.synced_upto
  ) and not exists (
    select 1 from public.embed_students s
    left join public.embed_notion_map m on m.kind = 'student' and m.key = s.id::text
    where m.synced_upto is null or s.updated_at > m.synced_upto
  ) then
    return false;
  end if;

  insert into public.embed_sync_batches default values returning id into v_id;
  perform net.http_post(
    url := 'https://werba-way.vercel.app/api/embed/notion-sync',
    body := jsonb_build_object('batch', v_id),
    headers := '{"Content-Type": "application/json"}'::jsonb,
    timeout_milliseconds := 60000
  );
  return true;
end;
$$;

-- Віддає змінене (до 12 результатів за раз) — лише для свіжої, ще не забраної партії
create or replace function public.embed_sync_fetch(p_batch uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_results jsonb;
  v_students jsonb;
  v_more boolean;
begin
  update public.embed_sync_batches set fetched_at = now()
  where id = p_batch and fetched_at is null and created_at > now() - interval '15 minutes';
  if not found then
    return null;
  end if;

  create temporary table _dirty on commit drop as
  select g.student_id, g.lesson_id, g.embed, g.last_at, m.notion_page_id, m.detail_block_id
  from (select student_id, lesson_id, embed, max(created_at) as last_at
        from public.embed_attempts group by 1, 2, 3) g
  left join public.embed_notion_map m
    on m.kind = 'result' and m.key = g.student_id || '|' || g.lesson_id || '|' || g.embed
  where m.synced_upto is null or g.last_at > m.synced_upto;

  v_more := (select count(*) from _dirty) > 12;

  select coalesce(jsonb_agg(r order by r.last_at), '[]'::jsonb) into v_results
  from (
    select d.student_id, d.lesson_id, d.embed, d.last_at, d.notion_page_id, d.detail_block_id,
      (select jsonb_agg(jsonb_build_object(
          'block_id', a.block_id, 'item_id', a.item_id, 'item_type', a.item_type,
          'grammar_point', a.grammar_point, 'prompt', a.prompt, 'answer', a.answer,
          'expected', a.expected, 'is_correct', a.is_correct, 'attempt_no', a.attempt_no,
          'created_at', a.created_at) order by a.created_at)
       from public.embed_attempts a
       where a.student_id = d.student_id and a.lesson_id = d.lesson_id and a.embed = d.embed
      ) as attempts
    from _dirty d
    order by d.last_at
    limit 12
  ) r;

  select coalesce(jsonb_agg(jsonb_build_object(
      'id', st.id, 'code', st.code, 'name', st.name, 'note', st.note,
      'self_created', st.self_created, 'archived', st.archived_at is not null,
      'lessons', st.lessons, 'first_total', st.first_total, 'first_ok', st.first_ok,
      'open_answers', st.open_answers, 'last_at', st.last_at,
      'sync_upto', greatest(s.updated_at, coalesce(st.last_at, s.updated_at)),
      'notion_page_id', m.notion_page_id)), '[]'::jsonb)
  into v_students
  from public.embed_student_stats st
  join public.embed_students s on s.id = st.id
  left join public.embed_notion_map m on m.kind = 'student' and m.key = st.id::text
  where m.synced_upto is null
     or greatest(s.updated_at, coalesce(st.last_at, s.updated_at)) > m.synced_upto
     or st.id in (select (x->>'student_id')::uuid from jsonb_array_elements(v_results) x);

  return jsonb_build_object('students', v_students, 'results', v_results, 'more', v_more);
end;
$$;

-- Запам'ятати сторінки Notion: [{kind, key, notion_page_id, detail_block_id, synced_upto}]
create or replace function public.embed_sync_save(p_batch uuid, p_items jsonb)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_n int;
begin
  if not exists (select 1 from public.embed_sync_batches
                 where id = p_batch and fetched_at > now() - interval '15 minutes') then
    return -1;
  end if;
  insert into public.embed_notion_map (kind, key, notion_page_id, detail_block_id, synced_upto)
  select x->>'kind', x->>'key', x->>'notion_page_id', nullif(x->>'detail_block_id', ''),
         (x->>'synced_upto')::timestamptz
  from jsonb_array_elements(p_items) x
  where x->>'kind' in ('student', 'result') and coalesce(x->>'notion_page_id', '') <> ''
  on conflict (kind, key) do update
    set notion_page_id = excluded.notion_page_id,
        detail_block_id = excluded.detail_block_id,
        synced_upto = excluded.synced_upto;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

grant execute on function public.embed_sync_fetch(uuid) to anon, authenticated;
grant execute on function public.embed_sync_save(uuid, jsonb) to anon, authenticated;

select cron.schedule('embed-notion-sync', '*/5 * * * *', 'select public.embed_sync_kick(false)');
select cron.schedule('embed-keepalive', '17 4 * * *', 'select public.embed_sync_kick(true)');
