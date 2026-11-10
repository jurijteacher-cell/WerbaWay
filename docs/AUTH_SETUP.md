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

## Обмеження, про які варто знати
- Сесія в ембеді (Notion iframe) окрема від сесії на сайті: учень входить окремо в кожному місці (один раз на браузер).
- Старий код можна «забрати» на свій акаунт, знаючи код (коди короткі) — ризик малий, бо переноситься лише історія вправ.
- Аналітика викладача читає останні 60 днів (до 20 000 відповідей); для великого класу потрібна агрегація в SQL.
