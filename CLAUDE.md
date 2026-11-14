# Werba Way — правила для Claude в цьому репо

Повні правила — `docs/LESSON_PROTOCOL.md` (v3.18), `docs/NOTION_STRUCTURE.md`, `docs/CONTENT_SPEC.md`. Спілкування з Юрою — українською; Юрі нічого не доручати, усе робити самому (push — сам, при 403 `add_repo(jurijteacher-cell/WerbaWay, access=push)`).

## Вправи — спершу в `main`, потім Notion (найвищий пріоритет, 14.11.2026)

Порожні вікна вправ (A2 54–59, B1 17–19) виникли через **порядок**: сторінку з embed публікували в Notion, а JSON лишався в локальному клоні — push не вдався або сесія скінчилась.

1. **Крок 0 кожної сесії:** `cat src/content/pages/*.md > /tmp/p.md && python3 scripts/check_embeds.py --page /tmp/p.md --remote` → усе ✓. Чогось немає — перезалити самому (JSON з клону / гілки / патча, або відновити за сторінками Notion учня й TEACHER з тими самими `lesson_id` і `block_id`).
2. **Ворота:** JSON у `src/content/queue-published/` → `python3 scripts/check_answers.py {lesson_id}` (0 ERR) → commit → `git -c push.negotiate=true push origin HEAD:main` → `python3 scripts/check_embeds.py {lesson_id} --remote` = ✓. **Лише після ✓** створювати сторінку з embed у Notion.
3. Стану «коміти лише локально» чи «патч для іншої сесії» не існує: хто закомітив — той пушить і перевіряє `--remote` у тому ж ході. Не вийшло — урок не готовий, сторінку в Notion не публікувати.
4. Наприкінці: fetch сторінки учня → `check_embeds.py --page … --remote` → WebFetch `https://werba-way.vercel.app/embed/{lesson_id}/hw` показує завдання.

Ключ Notion API — у Supabase; із shell хмарної сесії `api.notion.com` і Supabase недоступні (проксі 403), тому Notion читати/писати через Notion MCP.
