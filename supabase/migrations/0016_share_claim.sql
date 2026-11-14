-- Лекція за посиланням для залогіненого учня: /s/<token> додає цю лекцію йому в курс,
-- і далі він читає її на /learn/<slug> — тобто вправи, домашка й прогрес ідуть на його акаунт,
-- а не анонімно, як у гостя.
--
-- Учень не може сам писати в student_access (політика «teacher manages»), тому доступ
-- видає ця функція: вона бачить токен, перевіряє, що посилання не відкликане, і від імені
-- власника посилання відкриває учневі саму лекцію (kind='lesson'), більше нічого.
create or replace function public.claim_lecture_share(p_token text, p_module text default null)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slug  text;
  v_owner uuid;
  v_uid   uuid := auth.uid();
begin
  if v_uid is null then
    return null; -- гість читає лекцію через open_lecture_share
  end if;

  select lesson_slug, created_by into v_slug, v_owner
    from lecture_shares
   where token = p_token
     and revoked_at is null;

  if v_slug is null then
    return null; -- немає такого посилання або його відкликали
  end if;

  update lecture_shares
     set opens = opens + 1,
         last_opened_at = now()
   where token = p_token;

  -- викладач бачить усі лекції без доступів
  if public.is_teacher() then
    return v_slug;
  end if;

  -- профіль має бути (FK student_access.student_id → profiles.id)
  if not exists (select 1 from profiles where id = v_uid) then
    return v_slug;
  end if;

  -- курс уже відкритий цілком — окремий доступ до лекції зайвий.
  -- p_module передає сервер із frontmatter лекції (база про модулі не знає); на видачу
  -- доступу він не впливає — тільки на те, чи писати зайвий рядок.
  if p_module is not null and exists (
    select 1
      from student_access sa
     where sa.student_id = v_uid
       and sa.kind = 'module'
       and sa.ref = p_module
  ) then
    return v_slug;
  end if;

  insert into student_access (student_id, kind, ref, granted_by)
  values (v_uid, 'lesson', v_slug, v_owner)
  on conflict (student_id, kind, ref) do nothing;

  return v_slug;
end;
$$;

revoke all on function public.claim_lecture_share(text, text) from public, anon;
grant execute on function public.claim_lecture_share(text, text) to authenticated;
