-- Прогрес по сторінках лекції + автоматична домашка + сховище фото до письмових відповідей.
--
-- 1) page_progress — сторінки лекції, які учень сам позначив «Пройдено».
-- 2) mark_page_done() — позначає сторінку й, коли пройдено ≥ 20% сторінок лекції, сама кладе лекцію
--    в історію учня (lesson_progress, completed_via='auto') і задає домашку, якщо вона в уроці є.
--    Раніше це робила кнопка «Пройдено, задати домашку» в класі.
-- 3) бакет answer-photos — приватний; фото пише й підписує лише сервер (service role).

create table if not exists public.page_progress (
  student_id  uuid not null references public.profiles(id) on delete cascade,
  lesson_slug text not null check (lesson_slug ~ '^[a-z0-9][a-z0-9-]*$'),
  page_key    text not null check (char_length(page_key) between 1 and 120),
  done_at     timestamptz not null default now(),
  primary key (student_id, lesson_slug, page_key)
);

alter table public.page_progress enable row level security;

drop policy if exists "page_progress: teacher all" on public.page_progress;
create policy "page_progress: teacher all" on public.page_progress
  for all using (public.is_teacher()) with check (public.is_teacher());

drop policy if exists "page_progress: student reads own" on public.page_progress;
create policy "page_progress: student reads own" on public.page_progress
  for select using (student_id = auth.uid());

-- p_total — скільки сторінок у лекції (рахує клієнт із того, що показав), p_has_hw — чи є в уроці домашка.
-- Повертає { done, total, pct, homework_new }: homework_new = true лише в той виклик, що задав домашку.
create or replace function public.mark_page_done(p_slug text, p_page_key text, p_total int, p_has_hw boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid  uuid := auth.uid();
  v_done int;
  v_new  boolean := false;
  v_row  public.lesson_progress%rowtype;
begin
  if v_uid is null then
    raise exception 'unauthorized';
  end if;
  if p_slug is null or p_slug !~ '^[a-z0-9][a-z0-9-]*$'
     or p_page_key is null or char_length(p_page_key) not between 1 and 120
     or p_total is null or p_total not between 1 and 300 then
    raise exception 'bad args';
  end if;
  -- акаунт викладача нічого не записує: він лише переглядає лекції
  if public.is_teacher() then
    return jsonb_build_object('done', 0, 'total', p_total, 'pct', 0, 'homework_new', false, 'skipped', true);
  end if;

  insert into public.page_progress (student_id, lesson_slug, page_key)
  values (v_uid, p_slug, p_page_key)
  on conflict do nothing;

  select count(*) into v_done from public.page_progress where student_id = v_uid and lesson_slug = p_slug;
  if v_done > p_total then v_done := p_total; end if;

  if v_done * 5 >= p_total then            -- ≥ 20%
    select * into v_row from public.lesson_progress where student_id = v_uid and lesson_slug = p_slug;
    if not found then
      insert into public.lesson_progress (student_id, lesson_slug, completed_at, completed_via, homework_assigned_at)
      values (v_uid, p_slug, now(), 'auto', case when p_has_hw then now() end);
      v_new := coalesce(p_has_hw, false);
    else
      if v_row.homework_assigned_at is null and p_has_hw then
        update public.lesson_progress
           set homework_assigned_at = now(),
               completed_via = case when completed_via = 'share' then 'auto' else completed_via end
         where student_id = v_uid and lesson_slug = p_slug;
        v_new := true;
      elsif v_row.completed_via = 'share' then
        update public.lesson_progress set completed_via = 'auto' where student_id = v_uid and lesson_slug = p_slug;
      end if;
    end if;
  end if;

  return jsonb_build_object('done', v_done, 'total', p_total, 'pct', round(v_done * 100.0 / p_total), 'homework_new', v_new);
end;
$$;

revoke all on function public.mark_page_done(text, text, int, boolean) from public, anon;
grant execute on function public.mark_page_done(text, text, int, boolean) to authenticated;

-- Фото до письмових відповідей: приватний бакет, ≤ 6 МБ, лише зображення.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('answer-photos', 'answer-photos', false, 6291456, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false, file_size_limit = 6291456, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];
