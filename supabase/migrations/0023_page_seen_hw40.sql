-- Домашка від 40 % сторінок (було 20 %), і сторінка, яку учень просто бачив на екрані (клас: викладач гортає),
-- рахується так само, як позначена кнопкою «Пройдено».
--
-- page_progress.via: 'done' — учень натиснув «Пройдено»; 'seen' — сторінка була на екрані ≥ 15 с.
-- На сторінці лекції «пройденими» показуються лише via='done'; у відсоток для домашки йдуть обидві.

alter table public.page_progress
  add column if not exists via text not null default 'done' check (via in ('done', 'seen'));

-- Спільне ядро: порахувати пройдене й, якщо ≥ 40 %, покласти лекцію в історію та задати домашку.
create or replace function public._progress_check(p_uid uuid, p_slug text, p_total int, p_has_hw boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_done int;
  v_new  boolean := false;
  v_row  public.lesson_progress%rowtype;
begin
  select count(*) into v_done from public.page_progress where student_id = p_uid and lesson_slug = p_slug;
  if v_done > p_total then v_done := p_total; end if;

  if v_done * 5 >= p_total * 2 then            -- ≥ 40 %
    select * into v_row from public.lesson_progress where student_id = p_uid and lesson_slug = p_slug;
    if not found then
      insert into public.lesson_progress (student_id, lesson_slug, completed_at, completed_via, homework_assigned_at)
      values (p_uid, p_slug, now(), 'auto', case when p_has_hw then now() end);
      v_new := coalesce(p_has_hw, false);
    else
      if v_row.homework_assigned_at is null and p_has_hw then
        update public.lesson_progress
           set homework_assigned_at = now(),
               completed_via = case when completed_via = 'share' then 'auto' else completed_via end
         where student_id = p_uid and lesson_slug = p_slug;
        v_new := true;
      elsif v_row.completed_via = 'share' then
        update public.lesson_progress set completed_via = 'auto' where student_id = p_uid and lesson_slug = p_slug;
      end if;
    end if;
  end if;

  return jsonb_build_object('done', v_done, 'total', p_total, 'pct', round(v_done * 100.0 / p_total), 'homework_new', v_new);
end;
$$;

revoke all on function public._progress_check(uuid, text, int, boolean) from public, anon, authenticated;

create or replace function public.mark_page_done(p_slug text, p_page_key text, p_total int, p_has_hw boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'unauthorized';
  end if;
  if p_slug is null or p_slug !~ '^[a-z0-9][a-z0-9-]*$'
     or p_page_key is null or char_length(p_page_key) not between 1 and 120
     or p_total is null or p_total not between 1 and 300 then
    raise exception 'bad args';
  end if;
  if public.is_teacher() then
    return jsonb_build_object('done', 0, 'total', p_total, 'pct', 0, 'homework_new', false, 'skipped', true);
  end if;

  insert into public.page_progress (student_id, lesson_slug, page_key, via)
  values (v_uid, p_slug, p_page_key, 'done')
  on conflict (student_id, lesson_slug, page_key) do update set via = 'done';

  return public._progress_check(v_uid, p_slug, p_total, p_has_hw);
end;
$$;

-- Сторінка була на екрані достатньо довго: рахується в 40 %, але не показується як «Пройдено».
create or replace function public.mark_page_seen(p_slug text, p_page_key text, p_total int, p_has_hw boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'unauthorized';
  end if;
  if p_slug is null or p_slug !~ '^[a-z0-9][a-z0-9-]*$'
     or p_page_key is null or char_length(p_page_key) not between 1 and 120
     or p_total is null or p_total not between 1 and 300 then
    raise exception 'bad args';
  end if;
  if public.is_teacher() then
    return jsonb_build_object('done', 0, 'total', p_total, 'pct', 0, 'homework_new', false, 'skipped', true);
  end if;

  insert into public.page_progress (student_id, lesson_slug, page_key, via)
  values (v_uid, p_slug, p_page_key, 'seen')
  on conflict (student_id, lesson_slug, page_key) do nothing;

  return public._progress_check(v_uid, p_slug, p_total, p_has_hw);
end;
$$;

revoke all on function public.mark_page_done(text, text, int, boolean) from public, anon;
grant execute on function public.mark_page_done(text, text, int, boolean) to authenticated;
revoke all on function public.mark_page_seen(text, text, int, boolean) from public, anon;
grant execute on function public.mark_page_seen(text, text, int, boolean) to authenticated;
