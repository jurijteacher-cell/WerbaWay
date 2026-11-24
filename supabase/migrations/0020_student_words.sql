-- ============================================================
-- Werba Way — власні слова: «Мої колоди» (по 20 слів у колоді)
-- Колода = deck_no у межах власника (student_id). Викладач у класі додає слово в колоду
-- учня; викладач без учня — у власні. Слово можна правити й видаляти (soft: deleted_at).
-- ============================================================

create table if not exists public.student_words (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null references public.profiles(id) on delete cascade, -- власник колоди
  deck_no      int  not null default 1 check (deck_no >= 1),
  term         text not null check (char_length(term) between 1 and 120),
  forms        text check (forms is null or char_length(forms) <= 200),
  translation  text not null check (char_length(translation) between 1 and 200),
  tr_lang      text not null check (tr_lang in ('uk','ru','en','pl')),
  example      text check (example is null or char_length(example) <= 300),
  example_tr   text check (example_tr is null or char_length(example_tr) <= 300),
  note         text check (note is null or char_length(note) <= 300),
  source       text not null default 'manual' check (source in ('ai','ai-edited','manual')),
  created_by   uuid not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  deleted_at   timestamptz
);
create index if not exists student_words_owner_idx on public.student_words (student_id, deck_no, created_at);
create index if not exists student_words_creator_idx on public.student_words (created_by);

alter table public.student_words enable row level security;
create policy "words: teacher all" on public.student_words for all
  using (public.is_teacher()) with check (public.is_teacher());
create policy "words: owner reads" on public.student_words for select
  using (student_id = (select auth.uid()));  -- без deleted_at: інакше soft-delete (update) не проходить RLS; запити самі фільтрують
create policy "words: owner adds" on public.student_words for insert
  with check (student_id = (select auth.uid()) and created_by = (select auth.uid()));
create policy "words: owner edits" on public.student_words for update
  using (student_id = (select auth.uid())) with check (student_id = (select auth.uid()));

-- журнал AI-підказок: ліміт для учня (60 на добу)
create table if not exists public.word_suggest_log (
  id      bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  at      timestamptz not null default now()
);
create index if not exists word_suggest_log_idx on public.word_suggest_log (user_id, at desc);
alter table public.word_suggest_log enable row level security;
create policy "suggest log: own" on public.word_suggest_log for all
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
