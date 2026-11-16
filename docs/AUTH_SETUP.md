# Акаунти Werba Way: що налаштувати (Supabase + Resend)

Код сайту (гілка `feature/accounts`) готовий. Щоб реєстрація і скидання пароля працювали, треба зробити кроки нижче в дашбордах. Порядок важливий.

## 1. Resend (пошта)
1. resend.com → Domains → додай домен, з якого слати (напр. `werbaway.pl` або піддомен `mail.…`). Додай DNS-записи (SPF, DKIM), які покаже Resend, дочекайся «Verified».
2. Resend → API Keys → створи ключ (Sending access).

## 2. Supabase → Authentication
1. **Emails → SMTP Settings → Enable custom SMTP:**
   host `smtp.resend.com`, port `465`, username `resend`, password = API-ключ Resend, sender = адреса на верифікованому домені (напр. `no-reply@werbaway.pl`), sender name `Werba Way`.
   Без цього вбудована пошта Supabase шле лише на адреси команди і кілька листів на годину — учням листи не дійдуть.
2. **URL Configuration:**
   - Site URL: `https://werba-way.vercel.app`
   - Redirect URLs: `https://werba-way.vercel.app/auth/confirm`, `https://werba-way.vercel.app/auth/confirmed`
3. **Sign In / Providers → Email:** Confirm email = ON; мінімальна довжина пароля = 8 (рекомендовано також «Prevent use of leaked passwords»).
4. **Emails → Templates** (посилання з `token_hash` працюють у будь-якому браузері; стандартні PKCE-посилання ламаються, якщо учень відкрив лист на іншому пристрої):
   - *Confirm signup*: посилання
     `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup&next=/auth/confirmed`
   - *Reset password*: посилання
     `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password`
   Тексти листів — польською/українською, як зручно.

## 3. База даних (міграції)
- `0008_accounts.sql` — **до деплою сайту**: закриває дірку (будь-хто міг зробити себе вчителем через `profiles.role`), реєстрація завжди створює учня, акаунт ↔ учень, RPC для вправ, таблиця `mock_results`.
- `0009_disable_codes.sql` — **після деплою**: вимикає самостійне створення кодів.

## 4. Роль викладача
Після 0008 вчителя призначає лише викладач: у SQL Editor
`select public.set_role('твій@email', 'teacher');`
Старий код запрошення вчителя з функції `handle_new_user` більше не діє (функцію перезаписано) — його можна вважати відкликаним.

## 5. Перевірка після деплою
1. Зареєструйся тестовою поштою → лист прийшов → посилання веде на `/auth/confirmed`.
2. «Забув пароль» → лист → `/reset-password` → новий пароль → вхід.
3. Відкрий ембед у Notion → вхід тим самим email/паролем → відповіді з'являються в `/dashboard` і в `/teacher/analytics`.
4. Старі учні з кодом: у браузері, де лишився код, перший вхід переносить історію на акаунт (одноразово).

## Запрошення учня (кнопка «＋ Запросити учня» на /teacher/students)
1. Викладач вводить пошту → `POST /api/teacher/invite` (лише викладач): `auth.admin.generateLink({ type: 'invite' })` створює акаунт без пароля, у профілі тимчасово `full_name = пошта`.
2. Лист шле сам сайт через Resend (`src/lib/email.ts`, від `school@werbaway.com`, відповідь — на пошту викладача), **не** шаблоном Supabase «Invite user».
   Посилання: `<сайт>/auth/confirm?token_hash=…&type=invite&next=/welcome`.
3. `/welcome`: учень пише ім'я, прізвище, пароль → `auth.updateUser` + `profiles` → `/dashboard`.
   Посилання застаріле або вже використане → `/welcome?error=1` («попроси викладача надіслати ще раз»).
4. Повторне запрошення на ту саму адресу, поки учень не завершив реєстрацію, дає нове посилання. Якщо акаунт уже підтверджений — відповідь 409 і посилання на сторінку учня.
5. Скільки живе посилання — Supabase → Authentication → Sign In / Providers → Email → **Email OTP Expiration** (максимум 86400 с = 24 год).
6. Доступ до курсу дається як і раніше — на сторінці учня (AccessEditor); можна одразу після запрошення.

## Вхід через Google
Кнопка «Увійти через Google» — на /login і /register (`src/components/auth/GoogleButton.tsx`).
Повернення — `/auth/callback` (код → сесія; новому акаунту ім'я й прізвище з Google) → `next` або /dashboard.
Новий акаунт отримує роль учня (тригер `handle_new_user`); якщо акаунт з цією поштою вже є — Supabase прив'язує Google до нього.

Налаштування (одноразово):
1. Google Cloud Console → APIs & Services → OAuth consent screen: застосунок «Werba Way», домен `werbaway.com`, статус **In production**.
2. Credentials → Create OAuth client ID → Web application.
   Authorized JavaScript origins: `https://www.werbaway.com`, `https://werbaway.com`.
   Authorized redirect URI: `https://eucmiszjnaquqcsobbui.supabase.co/auth/v1/callback`.
3. Supabase → Authentication → Sign In / Providers → Google: увімкнути, вставити Client ID і Client Secret.
4. Supabase → Authentication → URL Configuration → Redirect URLs: `https://www.werbaway.com/**`, `https://werbaway.com/**`
   (без цього Supabase поверне на Site URL, а не на /auth/callback сайту).

## Обмеження, про які варто знати
- Сесія в ембеді (Notion iframe) окрема від сесії на сайті: учень входить окремо в кожному місці (один раз на браузер).
- Старий код можна «забрати» на свій акаунт, знаючи код (коди короткі) — ризик малий, бо переноситься лише історія вправ.
- Аналітика викладача читає останні 60 днів (до 20 000 відповідей); для великого класу потрібна агрегація в SQL.
