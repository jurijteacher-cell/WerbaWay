#!/usr/bin/env python3
"""Werba Way · перевірка пакета уроку за LESSON_PROTOCOL v3.1, CONTENT_SPEC v3.1 і картою курсу.

Використання:
    python3 validate_lesson.py <папка уроку> [--curriculum CURRICULUM_A0-A1.md]

Код виходу 0 — помилок немає (попередження можливі), 1 — є помилки.
"""
import argparse
import re
import sys
from pathlib import Path

from werba_common import (EXTRA_TAGS, FILE_PREFIX, all_strings, content_strings, find_lesson_files, iter_items,
                          load_curriculum, load_json, mentions, split_frontmatter)

LEVEL = {  # текст, словник, картки, граматичні блоки, пари, комунікаційні задачі
    "A0": {"text": (40, 80), "vocab": (15, 20), "cards": (4, 6), "blocks": (3, 4), "pairs": (2, 3), "comm": (2, 2)},
    "A1": {"text": (120, 180), "vocab": (20, 25), "cards": (6, 8), "blocks": (4, 5), "pairs": (3, 4), "comm": (2, 2)},
    "A2": {"text": (250, 350), "vocab": (28, 32), "cards": (8, 12), "blocks": (5, 7), "pairs": (4, 5), "comm": (3, 3)},
    "B1": {"text": (400, 500), "vocab": (35, 40), "cards": (10, 14), "blocks": (6, 8), "pairs": (5, 6), "comm": (3, 4)},
}
CARD_WORD = re.compile(r"[^\s✦📌→✗✓·—/]+")
CYRILLIC = re.compile(r"[А-Яа-яІіЇїЄєҐґ]")


class Report:
    def __init__(self):
        self.errors, self.warnings, self.info = [], [], []

    def err(self, msg):
        self.errors.append(msg)

    def warn(self, msg):
        self.warnings.append(msg)

    def ok(self, msg):
        self.info.append(msg)


def in_range(rep, label, value, rng):
    lo, hi = rng
    if lo <= value <= hi:
        rep.ok(f"{label}: {value} (норма {lo}–{hi})")
    else:
        rep.err(f"{label}: {value}, а має бути {lo}–{hi}")


def reading_text(body):
    m = re.search(r"## 1\. Czytanie\n(.*?)\n## ", body, re.S)
    if not m:
        return ""
    sec = m.group(1)
    h = re.search(r"\n### [^\n]+\n(.*)", sec, re.S)
    txt = h.group(1) if h else sec
    txt = re.sub(r"\[[A-Z]+:[^\]]*\]", "", txt).replace("**", "")
    return txt


def board_cards(body):
    """[(номер, заголовок, тіло)] для всіх карток усіх дошок."""
    cards = []
    for seg in body.split("[BOARD:")[1:]:
        seg = re.split(r"\n\*\*Ćwiczenia|\n\[EXERCISE|\n## ", seg)[0]
        for c in seg.split("\n### ")[1:]:
            title, _, text = c.partition("\n")
            num = "①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮".find(title.strip()[:1]) + 1
            cards.append((num, title.strip(), text))
    return cards


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("folder")
    ap.add_argument("--curriculum")
    args = ap.parse_args()

    rep = Report()
    lesson_id, files = find_lesson_files(args.folder)
    md_text = files["md"].read_text(encoding="utf-8")
    fm, body = split_frontmatter(md_text)
    level = fm.get("level", "B1")
    kind = fm.get("kind", "lesson")
    params = LEVEL.get(level)
    fm_tags = set(fm.get("grammar_points") or [])

    # ---------- JSON: парсинг, лапки, lesson_id ----------
    data = {}
    for k, p in files["json"].items():
        try:
            data[k] = load_json(p)
        except Exception as e:  # noqa: BLE001
            rep.err(f"{p.name}: JSON не парситься — {e}")
            continue
        if data[k].get("lesson_id") != lesson_id:
            rep.err(f"{p.name}: lesson_id = {data[k].get('lesson_id')!r}, очікується {lesson_id!r}")
        bad = [s for s in all_strings(data[k]) if '"' in s]
        if bad:
            rep.err(f"{p.name}: прямі лапки \" у значеннях ({len(bad)}): {bad[0][:60]}…")
    rep.ok(f"JSON-файлів: {len(data)} ({', '.join(sorted(data))})")

    # pictures.json optional (lessons may omit Opis zdjęć / picture-set)
    required = {"lesson": ["vocab", "comm-tasks", "grammar", "hw"],
                "review": ["vocab", "comm-tasks", "grammar", "hw"],
                "checkpoint": ["test"], "exam": ["test"]}[kind]
    if kind == "lesson" and level in ("A2", "B1"):
        required.append("exam")
    for r in required:
        if r not in data:
            rep.err(f"немає файлу {lesson_id}-{r}.json (обов'язковий для kind={kind}, level={level})")
    if not files["teacher"].exists():
        rep.err(f"немає файлу {files['teacher'].name}")

    # ---------- id ----------
    seen_ids = {}
    for k, d in data.items():
        prefix = FILE_PREFIX[k]
        for _, it in iter_items(k, d):
            iid = it.get("id")
            if not iid:
                if k == "vocab" and level not in ("A0", "A1"):
                    continue
                rep.err(f"{k}: елемент без id ({str(it)[:50]}…)")
                continue
            if not iid.startswith(prefix):
                rep.err(f"{k}: id {iid!r} має починатися з {prefix!r}")
            if iid in seen_ids:
                rep.err(f"id {iid!r} повторюється ({seen_ids[iid]} і {k})")
            seen_ids[iid] = k

    # ---------- теги ----------
    for k in ("grammar", "hw", "exam", "test"):
        for b, it in iter_items(k, data.get(k, {})):
            gp = it.get("grammar_point")
            skill = (b or {}).get("exam_skill")
            if k in ("grammar", "hw") or (k == "test" and skill in ("gramatyka", "slownictwo")):
                if not gp:
                    rep.err(f"{k}: {it.get('id')} без grammar_point")
                elif gp not in fm_tags:
                    rep.err(f"{k}: {it.get('id')} має тег {gp!r}, якого немає у frontmatter grammar_points")

    # ---------- варіанти відповідей ----------
    for k, d in data.items():
        for b, it in iter_items(k, d):
            if "options" in it and it.get("answer") not in it["options"]:
                rep.err(f"{k}: {it.get('id')} — answer немає серед options")
        for b in d.get("blocks", []):
            if b.get("exercise_type") == "drag-and-drop":
                bank = b.get("bank", [])
                miss = [it["id"] for it in b["items"] if it.get("answer") not in bank]
                if miss:
                    rep.err(f"{k}/{b['block_id']}: відповідей немає в bank: {miss}")

    # ---------- дошка / слайди ----------
    # Нові уроки можуть мати [SLIDES:] замість [BOARD:]; тоді картки не вимагаємо.
    has_slides = bool(re.search(r"\[SLIDES:", body))
    cards = board_cards(body)
    if kind in ("lesson", "review") and not has_slides:
        if params:
            in_range(rep, "Картки на дошці", len(cards), params["cards"])
        for num, title, text in cards:
            words = len(CARD_WORD.findall(text))
            rows = text.count("✦")
            pins = text.count("📌")
            if words > 45:
                rep.err(f"картка {title}: {words} слів (>45)")
            if not 2 <= rows <= 4:
                rep.err(f"картка {title}: {rows} рядків ✦ (треба 2–4)")
            if pins != 1:
                rep.err(f"картка {title}: {pins} стікерів 📌 (треба 1)")
            if "|" in text:
                rep.err(f"картка {title}: схоже на таблицю (символ |)")
        if kind == "lesson":
            traps = [c for c in cards if "Pułapki z ukraińskiego" in c[1]]
            if not traps:
                rep.err("немає картки «Pułapki z ukraińskiego»")
            for _, title, text in traps:
                for row in [r for r in text.splitlines() if r.startswith("✦")]:
                    if not (CYRILLIC.search(row) and "✗" in row and "✓" in row):
                        rep.warn(f"{title}: рядок без формату «укр → ✗ → ✓»: {row[:60]}")
        # покриття карток
        if "grammar" in data:
            covered = {c for b in data["grammar"].get("blocks", []) for c in b.get("covers_cards", [])}
            numbers = [n for n, _, _ in cards if n > 1]
            missing = [n for n in numbers if n not in covered]
            if missing:
                rep.err(f"картки без вправ (covers_cards): {missing}")
            if params and kind == "lesson":
                in_range(rep, "Граматичні блоки", len(data["grammar"].get("blocks", [])), params["blocks"])
    elif has_slides and "grammar" in data and params and kind == "lesson":
        in_range(rep, "Граматичні блоки", len(data["grammar"].get("blocks", [])), params["blocks"])
        rep.ok("Граматика через [SLIDES:] — перевірка карток BOARD пропущена")

    # ---------- маркери ----------
    folder = Path(args.folder)
    for f in re.findall(r'\[EXERCISE: file="([^"]+)"', body):
        if not (folder / f).exists():
            rep.err(f"маркер EXERCISE вказує на відсутній файл {f}")
    for m in re.findall(r"\[IMAGE:[^\]]*\]", body):
        if "source=" not in m:
            rep.err(f"IMAGE без source: {m[:60]}")

    # ---------- обсяги ----------
    if params and kind == "lesson":
        tw = len([w for w in re.findall(r"\S+", reading_text(body)) if re.search(r"\w", w)])
        in_range(rep, "Текст Czytanie, слів", tw, params["text"])
        if "vocab" in data:
            in_range(rep, "Словник", len(data["vocab"].get("items", [])), params["vocab"])
        if "pictures" in data:
            in_range(rep, "Пари в колажі", len(data["pictures"].get("items", [])), params["pairs"])
            for it in data["pictures"]["items"]:
                imgs = it.get("images", [])
                if len(imgs) != 2 or not all("source" in i for i in imgs):
                    rep.err(f"pictures: {it.get('id')} — треба 2 фото, у кожного source")
        if "comm-tasks" in data:
            items = data["comm-tasks"].get("items", [])
            in_range(rep, "Комунікаційні задачі", len(items), params["comm"])
            dlg = (items[0] if items else {}).get("model_dialogue", [])
            if not 10 <= len(dlg) <= 14:
                rep.err(f"c1.model_dialogue: {len(dlg)} реплік (треба 10–14)")

    # ---------- A0: instruction_uk ----------
    if level == "A0":
        for k, d in data.items():
            nodes = [d] + d.get("blocks", [])
            for n in nodes:
                if "instruction" in n and "instruction_uk" not in n:
                    rep.err(f"{k}: немає instruction_uk поруч з instruction ({n.get('block_id', 'top')})")

    # ---------- файл викладача: хвилини ----------
    if files["teacher"].exists():
        t = files["teacher"].read_text(encoding="utf-8")
        tfm, tbody = split_frontmatter(t)
        dur, ses = tfm.get("duration_minutes", 90), tfm.get("sessions", 1)
        per = dur // ses if ses else dur
        # Лише основні «### Заняття N» (не варіант 3×60 і не «Заняття A/B/C»).
        sessions = re.findall(
            r"(### Заняття \d+[^\n]*\n.*?)(?=\n### |\n## |\Z)",
            tbody,
            re.S,
        )
        if not sessions:
            sessions = re.split(r"\n### ", tbody)[1:] or [tbody]
        for sidx, s in enumerate(sessions, 1):
            mins = [int(x) for x in re.findall(r"^\| (\d+) \|", s, re.M)]
            if mins and sum(mins) != per:
                rep.err(f"teacher.md, заняття {sidx}: сума хвилин {sum(mins)}, а має бути {per}")
            elif mins:
                rep.ok(f"teacher.md, заняття {sidx}: {sum(mins)} хв")

    # ---------- домашка не повторює урок ----------
    if "hw" in data:
        lesson_sentences = set()
        for src in [body] + [s for k, d in data.items() if k != "hw" for s in all_strings(d)]:
            for sent in re.split(r"(?<=[.!?])\s+", src):
                sent = sent.strip()
                if len(sent.split()) >= 4:
                    lesson_sentences.add(sent.lower())
        for _, it in iter_items("hw", data["hw"]):
            for s in (it.get("text"), it.get("prompt"), it.get("answer")):
                if s and s.strip().lower() in lesson_sentences:
                    rep.err(f"hw: {it.get('id')} повторює речення з уроку: {s[:60]}")

    # ---------- карта курсу ----------
    if args.curriculum and level in ("A0", "A1"):
        cur = load_curriculum(args.curriculum)
        rows = cur["lessons"]
        row = next((r for r in rows if r["cid"] == str(fm.get("curriculum_id"))), None)
        if not row:
            rep.err(f"curriculum_id {fm.get('curriculum_id')!r} немає в карті")
        else:
            n = row["n"]
            prefix = "pl-a0" if n <= 4 else "pl-a1"
            expect_id = f"{prefix}-{n:02d}-{row['slug']}"
            if lesson_id != expect_id:
                rep.err(f"id уроку {lesson_id!r}, за картою має бути {expect_id!r}")
            for fld in ("kind",):
                if fm.get(fld) != row[fld]:
                    rep.err(f"frontmatter {fld} = {fm.get(fld)!r}, у карті {row[fld]!r}")
            for fld in ("new", "rec"):
                if sorted(fm.get(fld) or []) != sorted(row[fld]):
                    rep.err(f"frontmatter {fld} = {fm.get(fld)}, у карті {row[fld]}")
            if row.get("can_do") and sorted(fm.get("can_do") or []) != sorted(row["can_do"]):
                rep.err(f"frontmatter can_do = {fm.get('can_do')}, у карті {row['can_do']}")
            allowed = set(row["new"]) | set(row["rec"]) | EXTRA_TAGS
            extra = fm_tags - allowed
            if extra:
                rep.err(f"grammar_points поза new/rec уроку: {sorted(extra)}")
            registry = set(cur["grammar_points"])
            unknown = fm_tags - registry
            if unknown:
                rep.err(f"теги поза реєстром: {sorted(unknown)}")

            # кожен rec: ≥1 блок з цим тегом або ≥3 завдання
            tagged = {}
            block_tags = {}
            for k in ("grammar", "hw"):
                for b in data.get(k, {}).get("blocks", []):
                    tags = [it.get("grammar_point") for it in b.get("items", [])]
                    for t in tags:
                        tagged[t] = tagged.get(t, 0) + 1
                    if tags and len(set(tags)) == 1:
                        block_tags.setdefault(tags[0], []).append(f"{k}/{b['block_id']}")
            for t in row["rec"]:
                cnt = tagged.get(t, 0)
                if cnt >= 3 or t in block_tags:
                    rep.ok(f"rec {t}: {cnt} завдань" + (f", блоки {block_tags[t]}" if t in block_tags else ""))
                else:
                    rep.err(f"rec {t}: лише {cnt} завдань і жодного блоку (треба ≥3 або блок)")
            for t in row["new"]:
                if tagged.get(t, 0) < 6:
                    rep.err(f"new {t}: лише {tagged.get(t, 0)} завдань (очікується ≥6)")

            # core уроку в словнику
            if row["core"] and "vocab" in data:
                terms = {it["term"].lower() for it in data["vocab"]["items"]}
                miss = [w for w in row["core"] if w.lower() not in terms]
                if miss:
                    rep.err(f"core-слова уроку відсутні в словнику: {miss}")
                else:
                    rep.ok(f"усі {len(row['core'])} core-слів у словнику")

            # ≥6 core двох попередніх уроків
            if kind == "lesson":
                prev = [r for r in rows if r["n"] < n and r["core"]][-2:]
                pool = [(r["n"], w) for r in prev for w in r["core"]]
                md_content = re.sub(r"\[[A-Z]+:[^\]]*\]", "", body.split("## Słowniczek")[0])
                corpus_parts = [md_content]
                for k in ("comm-tasks", "grammar", "hw", "pictures"):
                    corpus_parts += list(content_strings(data.get(k, {})))
                corpus = " ".join(corpus_parts).lower()
                found = [(ln, w) for ln, w in pool if mentions(w, corpus)]
                msg = ", ".join(f"{w} ({ln})" for ln, w in found)
                if len(found) >= 6:
                    rep.ok(f"повторено core попередніх уроків: {len(found)} — {msg}")
                else:
                    rep.err(f"повторено лише {len(found)} core-слів уроків {[r['n'] for r in prev]} (треба ≥6): {msg}")
                declared = {w.lower() for rc in (fm.get("recycles") or []) for w in rc.get("words", [])}
                found_words = {w.lower() for _, w in found}
                not_found = declared - found_words
                if not_found:
                    rep.warn(f"у recycles заявлено, але не знайдено в уроці: {sorted(not_found)}")

            if row.get("traps"):
                rep.ok("пастки з карти (перевір на дошці вручну): " + " | ".join(row["traps"]))

    # ---------- звіт ----------
    print(f"== {lesson_id}  ({level}, {kind})")
    for m in rep.info:
        print("  ✓", m)
    for m in rep.warnings:
        print("  ! ", m)
    for m in rep.errors:
        print("  ✗", m)
    print(f"== помилок: {len(rep.errors)}, попереджень: {len(rep.warnings)}")
    sys.exit(1 if rep.errors else 0)


if __name__ == "__main__":
    main()
