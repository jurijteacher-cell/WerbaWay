-- Мова інтерфейсу і пояснень. Кука вирішує на кожному запиті, профіль —
-- щоб вибір їхав за людиною на інший пристрій.
alter table public.profiles
  add column if not exists locale text not null default 'uk'
  check (locale in ('uk', 'ru', 'pl', 'en'));

comment on column public.profiles.locale is
  'Мова інтерфейсу та пояснень у лекціях (польський матеріал не перекладається).';
