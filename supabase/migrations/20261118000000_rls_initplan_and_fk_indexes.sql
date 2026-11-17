-- Швидкість запитів: RLS рахувався заново для кожного рядка + бракувало індексів.
--
-- Що саме було не так
-- -------------------
-- 1. У політиках RLS стоять `auth.uid()` та `is_teacher()`. Postgres вважає їх
--    волатильними в контексті політики й викликає ДЛЯ КОЖНОГО РЯДКА таблиці.
--    `is_teacher()` усередині робить ще два `exists` по `teachers` і `profiles`,
--    тож вибірка 30 домашок коштувала 60+ зайвих підзапитів.
--    Обгортка `(select …)` перетворює виклик на InitPlan — одне обчислення на
--    весь запит. Логіка політик НЕ змінюється, лише місце обчислення.
--    https://supabase.com/docs/guides/database/postgres/row-level-security
--
-- 2. 19 зовнішніх ключів без індексів. Там, де таблиця росте з кожним уроком
--    (здані завдання, спроби, оцінки), кожне з'єднання йшло послідовним читанням.
--
-- Нічого не видаляється, доступи лишаються ті самі.

-- ── 1. Хелпери: hoist auth.uid() всередині самих функцій ──────────────────────

create or replace function public.is_teacher()
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (select 1 from public.teachers where user_id = (select auth.uid()))
      or exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'teacher');
$$;

create or replace function public.teaches(p_student uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1
    from public.group_members gm
    join public.student_groups g on g.id = gm.group_id
    where gm.student_id = p_student
      and gm.left_at is null
      and g.teacher_id = (select auth.uid())
  );
$$;

create or replace function public.owns_group(p_group uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (select 1 from public.student_groups where id = p_group and teacher_id = (select auth.uid()));
$$;

create or replace function public.in_group(p_group uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (select 1 from public.group_members
                 where group_id = p_group and student_id = (select auth.uid()) and left_at is null);
$$;

-- ── 2. Політики: ті самі умови, але обчислені один раз ────────────────────────

-- profiles
alter policy "profiles: own row or teacher sees all" on public.profiles
  using (((select auth.uid()) = id) or (select public.is_teacher()));
alter policy "profiles: update own row" on public.profiles
  using ((select auth.uid()) = id);

-- submissions
alter policy "submissions: student reads own, teacher reads all" on public.submissions
  using (((select auth.uid()) = student_id) or (select public.is_teacher()));
alter policy "submissions: student inserts own" on public.submissions
  with check ((select auth.uid()) = student_id);
alter policy "submissions: student updates own, teacher updates any (grading)" on public.submissions
  using (((select auth.uid()) = student_id) or (select public.is_teacher()));

-- assignments
alter policy "assignments: student reads own, teacher reads all" on public.assignments
  using (((select auth.uid()) = student_id) or (select public.is_teacher()));
alter policy "assignments: only teacher assigns" on public.assignments
  with check ((select public.is_teacher()));
alter policy "assignments: only teacher removes" on public.assignments
  using ((select public.is_teacher()));

-- lesson_progress  (цю таблицю читає дзвіночок викладача)
alter policy "student reads own lesson_progress" on public.lesson_progress
  using (student_id = (select auth.uid()));
alter policy "teacher manages lesson_progress" on public.lesson_progress
  using ((select public.is_teacher()))
  with check ((select public.is_teacher()));

-- bug_reports
alter policy "author inserts own report" on public.bug_reports
  with check (reporter_id = (select auth.uid()));
alter policy "author reads own reports" on public.bug_reports
  using (reporter_id = (select auth.uid()));
alter policy "teacher manages reports" on public.bug_reports
  using ((select public.is_teacher()))
  with check ((select public.is_teacher()));

-- student_submissions
alter policy "insert_own_submission" on public.student_submissions
  with check (student_id = (select auth.uid()));
alter policy "read_submissions" on public.student_submissions
  using ((student_id = (select auth.uid())) or public.teaches(student_id));

-- item_attempts / lesson_runs / rubric_scores
alter policy "read_attempts" on public.item_attempts
  using ((student_id = (select auth.uid())) or public.teaches(student_id));
alter policy "read_runs" on public.lesson_runs
  using ((student_id = (select auth.uid())) or public.teaches(student_id));
alter policy "read_rubrics" on public.rubric_scores
  using ((student_id = (select auth.uid())) or public.teaches(student_id));

-- student_groups / group_members
alter policy "read_groups" on public.student_groups
  using ((teacher_id = (select auth.uid())) or public.in_group(id));
alter policy "insert_groups" on public.student_groups
  with check ((teacher_id = (select auth.uid())) and (select public.is_teacher()));
alter policy "update_groups" on public.student_groups
  using (teacher_id = (select auth.uid()))
  with check (teacher_id = (select auth.uid()));
alter policy "delete_groups" on public.student_groups
  using (teacher_id = (select auth.uid()));
alter policy "read_members" on public.group_members
  using ((student_id = (select auth.uid())) or public.owns_group(group_id));

-- embed_students / embed_attempts
alter policy "embed_students: own row" on public.embed_students
  using (user_id = (select auth.uid()));
alter policy "embed_students: teacher all" on public.embed_students
  using ((select public.is_teacher()))
  with check ((select public.is_teacher()));
alter policy "embed_attempts: own reads" on public.embed_attempts
  using (student_id in (select id from public.embed_students where user_id = (select auth.uid())));
alter policy "embed_attempts: teacher reads" on public.embed_attempts
  using ((select public.is_teacher()));
alter policy "embed_attempts: teacher deletes" on public.embed_attempts
  using ((select public.is_teacher()));

-- vocab_progress / student_access / mock_results / class_rooms
alter policy "student manages own vocab_progress" on public.vocab_progress
  using (student_id = (select auth.uid()))
  with check (student_id = (select auth.uid()));
alter policy "teacher reads vocab_progress" on public.vocab_progress
  using ((select public.is_teacher()));
alter policy "student reads own student_access" on public.student_access
  using (student_id = (select auth.uid()));
alter policy "teacher manages student_access" on public.student_access
  using ((select public.is_teacher()))
  with check ((select public.is_teacher()));
alter policy "mock_results: own or teacher reads" on public.mock_results
  using ((user_id = (select auth.uid())) or (select public.is_teacher()));
alter policy "mock_results: insert own" on public.mock_results
  with check (user_id = (select auth.uid()));
alter policy "mock_results: teacher deletes" on public.mock_results
  using ((select public.is_teacher()));
alter policy "class_rooms: student reads own" on public.class_rooms
  using ((select auth.uid()) = student_id);
alter policy "class_rooms: teacher manages" on public.class_rooms
  using ((select public.is_teacher()))
  with check ((select public.is_teacher()));

-- ── 3. Індекси на зовнішні ключі таблиць, що ростуть з кожним уроком ──────────
-- Довідники курсу (course_*) свідомо пропущені: вони маленькі й статичні,
-- індекс там лише сповільнював би запис.

create index if not exists student_submissions_student_idx on public.student_submissions (student_id);
create index if not exists student_submissions_lesson_idx  on public.student_submissions (lesson_id);
create index if not exists item_attempts_item_idx          on public.item_attempts (item_id);
create index if not exists lesson_runs_lesson_idx          on public.lesson_runs (lesson_id);
create index if not exists rubric_scores_lesson_idx        on public.rubric_scores (lesson_id);
create index if not exists rubric_scores_submission_idx    on public.rubric_scores (submission_id);
create index if not exists rubric_scores_teacher_idx       on public.rubric_scores (teacher_id);
create index if not exists rubric_scores_can_do_idx        on public.rubric_scores (can_do_id);
create index if not exists bug_reports_reporter_idx        on public.bug_reports (reporter_id);
create index if not exists assignments_assigned_by_idx     on public.assignments (assigned_by);
create index if not exists lecture_shares_created_by_idx   on public.lecture_shares (created_by);
create index if not exists student_access_granted_by_idx   on public.student_access (granted_by);
create index if not exists student_groups_teacher_idx      on public.student_groups (teacher_id);

-- Запит дзвіночка: «останні здані домашки за 30 днів».
-- Частковий індекс — у таблиці більшість рядків без homework_done_at.
create index if not exists lesson_progress_homework_done_idx
  on public.lesson_progress (homework_done_at desc)
  where homework_done_at is not null;
