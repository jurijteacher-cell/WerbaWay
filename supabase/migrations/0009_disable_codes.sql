-- ============================================================
-- Werba Way — вимкнути самостійне створення кодів
-- Виконати ПІСЛЯ 0008 і ПІСЛЯ деплою фронтенду з входом в ембедах.
-- Старі коди й надалі приймає embed_claim_code (одноразове перенесення історії).
-- ============================================================
revoke execute on function public.embed_create_student(text, text) from anon, authenticated;

-- legacy code-based RPCs (anonymous writes by code) — replaced by embed_record_attempt_me
revoke execute on function public.embed_create_student(text, text) from public, anon, authenticated;
revoke execute on function public.embed_record_attempt(text, text, text, text, text, text, text, text, text, text, boolean) from public, anon, authenticated;
revoke execute on function public.embed_student_name(text) from public, anon, authenticated;
