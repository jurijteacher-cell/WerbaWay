-- ============================================================
-- Werba Way — ім'я/прізвище окремими полями + роль при реєстрації
-- Виконати ПІСЛЯ 0001, 0002, 0003
-- ============================================================

alter table public.profiles add column if not exists first_name text;
alter table public.profiles add column if not exists last_name text;

-- ЗАМІНИ 'werba-teacher-2026' на свій приватний код перед виконанням цієї
-- міграції (і не публікуй його в публічному репозиторії). Це єдине місце,
-- де перевіряється право зареєструватись одразу як вчитель — перевірка на
-- сервері (в Postgres), а не в браузері, тому підробити її з клієнта
-- неможливо: що б людина не відправила в формі реєстрації, роль стане
-- 'teacher' лише якщо код співпав тут.
--
-- Якщо код невірний — реєстрація ПРОВАЛЮЄТЬСЯ з помилкою (а не тихо
-- створює учня). Це навмисно: людина, що обрала "Вчитель", має точно
-- знати, що щось не так, а не думати, що отримала доступ вчителя.
--
-- Щоб пізніше змінити код — просто виконай цей самий CREATE OR REPLACE
-- FUNCTION ще раз з новим значенням, нічого більше робити не треба.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role text := coalesce(new.raw_user_meta_data->>'requested_role', 'student');
  supplied_code text := new.raw_user_meta_data->>'teacher_code';
  first_name text := nullif(trim(new.raw_user_meta_data->>'first_name'), '');
  last_name text := nullif(trim(new.raw_user_meta_data->>'last_name'), '');
begin
  if requested_role = 'teacher' and supplied_code is distinct from 'werba-teacher-2026' then
    raise exception 'Невірний код запрошення вчителя';
  end if;

  insert into public.profiles (id, full_name, first_name, last_name, role)
  values (
    new.id,
    nullif(trim(coalesce(first_name, '') || ' ' || coalesce(last_name, '')), ''),
    first_name,
    last_name,
    case when requested_role = 'teacher' then 'teacher' else 'student' end
  );
  return new;
end;
$$;
