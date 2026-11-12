-- Публічні посилання на лекції: /s/<token> відкривається без входу.
create table if not exists public.lecture_shares (
  token text primary key,
  lesson_slug text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  opens integer not null default 0,
  last_opened_at timestamptz
);
create index if not exists lecture_shares_slug_idx on public.lecture_shares (lesson_slug) where revoked_at is null;

alter table public.lecture_shares enable row level security;

create policy "teacher manages lecture_shares" on public.lecture_shares
  for all using (public.is_teacher()) with check (public.is_teacher());

-- гість не бачить таблицю: лише дізнається лекцію за дійсним токеном
create or replace function public.open_lecture_share(p_token text, p_count boolean default false)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare v_slug text;
begin
  select lesson_slug into v_slug from lecture_shares where token = p_token and revoked_at is null;
  if v_slug is not null and p_count then
    update lecture_shares set opens = opens + 1, last_opened_at = now() where token = p_token;
  end if;
  return v_slug;
end;
$$;

revoke all on function public.open_lecture_share(text, boolean) from public;
grant execute on function public.open_lecture_share(text, boolean) to anon, authenticated;
