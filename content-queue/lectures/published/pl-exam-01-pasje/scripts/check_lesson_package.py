#!/usr/bin/env python3
"""Werba Way: перевірка пакета уроку ДО збірки.

Запуск:  python3 scripts/check_lesson_package.py <папка_пакета>
Код виходу 0 — можна збирати. 1 — є помилки (ERROR), збірку не починати,
помилки віддати в звіт для Claude. WARN — не блокує, але йде у звіт.

Скрипт нічого не змінює у файлах.
"""
import json
import re
import sys
from pathlib import Path

ERRORS, WARNS = [], []


def err(msg):
    ERRORS.append(msg)


def warn(msg):
    WARNS.append(msg)


def words(text):
    return re.findall(r"[\wąćęłńóśźżĄĆĘŁŃÓŚŹŻ-]+", text)


def load_json(path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as e:  # noqa: BLE001
        err(f"{path.name}: JSON не парситься: {e}")
        return None


def frontmatter(md_text):
    m = re.match(r"^---\n(.*?)\n---\n", md_text, re.S)
    if not m:
        err("lesson .md: немає frontmatter")
        return {}
    fm = {}
    for line in m.group(1).splitlines():
        if ":" in line and not line.startswith(" "):
            k, v = line.split(":", 1)
            fm[k.strip()] = v.strip()
    return fm


def parse_list(value):
    value = value.split("#", 1)[0].strip()
    if value.startswith("[") and value.endswith("]"):
        return [x.strip().strip('"') for x in value[1:-1].split(",") if x.strip()]
    return []


PREFIX = {"vocab": "v", "pictures": "p", "comm-tasks": "c", "grammar": "g",
          "hw": "h", "exam": "e", "test": "t"}
FORBIDDEN_IN_THEORY = re.compile(r"wyjąt|oprócz|z wyjątkiem", re.I)
CYRILLIC = re.compile(r"[а-яіїєґА-ЯІЇЄҐ]")


def check_items_block(fname, block, gpoints, need_gp):
    et = block.get("exercise_type")
    items = block.get("items", [])
    if not items:
        err(f"{fname} {block.get('block_id')}: порожній блок")
    for it in items:
        iid = it.get("id", "?")
        if need_gp:
            gp = it.get("grammar_point")
            if gp not in gpoints:
                err(f"{fname} {iid}: grammar_point «{gp}» немає у frontmatter")
        if et == "fill-in-blank":
            if it.get("text", "").count("___") != 1:
                err(f"{fname} {iid}: у text має бути рівно один ___")
            opts = it.get("options")
            if opts is not None:
                if it["answer"] not in opts:
                    err(f"{fname} {iid}: answer не входить в options")
                if len(set(opts)) != len(opts):
                    err(f"{fname} {iid}: options повторюються")
        elif et == "multiple-choice":
            opts = it.get("options", [])
            if len(opts) != 3:
                err(f"{fname} {iid}: multiple-choice має мати 3 options")
            if it.get("answer") not in opts:
                err(f"{fname} {iid}: answer не входить в options")
            if not it.get("explanation"):
                err(f"{fname} {iid}: немає explanation")
        elif et == "true-false":
            if not isinstance(it.get("answer"), bool):
                err(f"{fname} {iid}: answer має бути true/false")
            if not it.get("explanation"):
                err(f"{fname} {iid}: немає explanation")
        elif et == "sentence-building":
            acc = it.get("accept", [])
            if it.get("answer") in acc:
                err(f"{fname} {iid}: answer продубльовано в accept")
            if not it.get("prompt"):
                err(f"{fname} {iid}: немає prompt")
        elif et == "matching":
            if not it.get("left") or not it.get("right"):
                err(f"{fname} {iid}: matching без left/right")
        elif et == "drag-and-drop":
            if it.get("text", "").count("___") != 1:
                err(f"{fname} {iid}: у text має бути рівно один ___")
    if et == "matching":
        rights = [it.get("right") for it in items]
        if len(set(rights)) != len(rights):
            err(f"{fname} {block.get('block_id')}: однакові right у matching — пару не визначити")
    if et == "drag-and-drop":
        bank = list(block.get("bank", []))
        for it in items:
            if it["answer"] in bank:
                bank.remove(it["answer"])
            else:
                err(f"{fname} {it['id']}: answer «{it['answer']}» немає в bank")
        if not 2 <= len(bank) <= 3:
            warn(f"{fname} {block.get('block_id')}: у bank {len(bank)} зайвих слів (норма 2–3)")
    if et == "true-false":
        falses = sum(1 for it in items if it.get("answer") is False)
        if block.get("block_id") == "e1" and (len(items) != 6 or not 3 <= falses <= 4):
            err(f"{fname} e1: має бути 6 тверджень, 3–4 хибні (зараз {len(items)}, хибних {falses})")


def main(pkg):
    pkg = Path(pkg)
    mds = [p for p in pkg.glob("*.md") if not p.name.endswith("-teacher.md")
           and not p.name.startswith("CURSOR_TASK")]
    if len(mds) != 1:
        err(f"очікую один .md уроку, знайдено {len(mds)}")
        return
    md = mds[0]
    lesson_id = md.stem
    md_text = md.read_text(encoding="utf-8")
    fm = frontmatter(md_text)
    gpoints = set(parse_list(fm.get("grammar_points", "")))
    if not gpoints:
        err("frontmatter: порожній grammar_points")

    files = {}
    for p in sorted(pkg.glob(f"{lesson_id}-*.json")):
        kind = p.stem[len(lesson_id) + 1:]
        data = load_json(p)
        if data is None:
            continue
        files[kind] = data
        if data.get("lesson_id") != lesson_id:
            err(f"{p.name}: lesson_id ≠ {lesson_id}")
        raw = p.read_text(encoding="utf-8")
        if '\\"' in raw:
            err(f"{p.name}: прямі лапки всередині значень — потрібні „…”")

    # маркери в .md
    for m in re.finditer(r"\[(EXERCISE|SLIDES):[^\]]*file=\"([^\"]+)\"[^\]]*\]", md_text):
        f = m.group(2)
        if not (pkg / f).exists():
            err(f"маркер {m.group(1)} посилається на відсутній файл {f}")
    for m in re.finditer(r"\[EXERCISE:[^\]]*file=\"([^\"]+)\"[^\]]*blocks=\"([^\"]+)\"", md_text):
        f, rng = m.group(1), m.group(2)
        data = load_json(pkg / f) if (pkg / f).exists() else None
        if not data:
            continue
        ids = [b["block_id"] for b in data.get("blocks", [])]
        parts = rng.split("-")
        for x in parts:
            if x not in ids:
                err(f"маркер blocks=\"{rng}\": блоку {x} немає у {f}")
    if re.search(r"\b(TODO|TBD|FIXME)\b", md_text):
        err("lesson .md: службові примітки (TODO/TBD/FIXME)")
    if '"' in re.sub(r"\[[A-Z]+:[^\]]*\]", "", md_text.split("---", 2)[2]):
        warn("lesson .md: прямі лапки в тексті — перевір, чи це не цитата (потрібні „…”)")

    # унікальність id і префікси
    seen = {}
    for kind, data in files.items():
        pref = PREFIX.get(kind)
        coll = []
        for b in data.get("blocks", []):
            coll += b.get("items", [])
        coll += data.get("items", [])
        for it in coll:
            iid = it.get("id")
            if not iid:
                err(f"{kind}: елемент без id")
                continue
            if pref and not iid.startswith(pref):
                err(f"{kind} {iid}: id має починатися з «{pref}»")
            if iid in seen:
                err(f"id {iid} повторюється ({seen[iid]} і {kind})")
            seen[iid] = kind

    # слайди
    slides = files.get("slides", {}).get("slides", [])
    slide_ids = {s["id"] for s in slides}
    traps = 0
    for s in slides:
        sid = s["id"]
        if not s.get("teacher_note"):
            err(f"slides {sid}: немає teacher_note")
        blob = json.dumps(s, ensure_ascii=False)
        if "___" in blob:
            err(f"slides {sid}: прочерк ___ у презентації")
        if blob.count("[[") > 6:
            err(f"slides {sid}: більше 6 виділень [[...]]")
        if s.get("section") == "teoria":
            text = json.dumps({k: v for k, v in s.items() if k != "teacher_note"}, ensure_ascii=False)
            if FORBIDDEN_IN_THEORY.search(text):
                err(f"slides {sid}: у теорії є «wyjątek / oprócz»")
        for row in s.get("rows", []):
            for cell in row:
                if not str(cell).strip():
                    err(f"slides {sid}: порожня клітинка")
                if len(words(re.sub(r"\[\[|\]\]", "", str(cell)))) > 6:
                    warn(f"slides {sid}: клітинка довша за 4–6 слів: «{cell}»")
        if len(s.get("rows", [])) > 6 or len(s.get("headers", [])) > 6:
            err(f"slides {sid}: таблиця більша за 6 × 6")
        for ex in s.get("items", []) if s.get("kind") == "exceptions" else []:
            if ex.get("refers_to") not in slide_ids:
                err(f"slides {sid}: refers_to «{ex.get('refers_to')}» не існує")
        if s.get("kind") == "traps":
            for t in s.get("items", []):
                traps += 1
                if not CYRILLIC.search(t.get("uk", "")):
                    err(f"slides {sid}: пастка без української форми")
                if t.get("why", "").lower().startswith("dlaczego"):
                    err(f"slides {sid}: why не має починатися з «Dlaczego»")
    if slides and not 5 <= traps <= 6:
        err(f"slides: пасток {traps}, норма 5–6")

    # covers_slides
    covered = set()
    for kind in ("grammar", "exam"):
        for b in files.get(kind, {}).get("blocks", []):
            covered |= set(b.get("covers_slides", []))
    for sid in sorted(slide_ids - covered, key=lambda x: int(x[1:])):
        if sid != "s1":
            err(f"slides {sid}: не покритий жодним блоком (covers_slides)")
    for sid in covered - slide_ids:
        err(f"covers_slides: слайда {sid} не існує")

    # блоки вправ
    for kind in ("grammar", "hw", "exam", "test"):
        for b in files.get(kind, {}).get("blocks", []):
            check_items_block(kind, b, gpoints, need_gp=kind in ("grammar", "hw"))
            if b.get("exam_skill") == "sluchanie":
                if not b.get("max_plays"):
                    err(f"{kind} {b['block_id']}: слухання без max_plays")
                for it in b.get("items", []):
                    if b.get("audio_mode") == "per-item" and not (it.get("audio_id") and it.get("dialogue")):
                        err(f"{kind} {it['id']}: per-item аудіо без audio_id / dialogue")

    # словник
    voc = files.get("vocab")
    if voc:
        groups = set(voc.get("groups", []))
        for it in voc["items"]:
            if it.get("group") not in groups:
                err(f"vocab {it['id']}: група «{it.get('group')}» не в groups")
            for f in ("term", "definition", "example", "translation_uk", "part_of_speech"):
                if not it.get(f):
                    err(f"vocab {it['id']}: немає {f}")
        if not set(voc.get("comm_groups", [])) <= groups:
            err("vocab: comm_groups не входять у groups")
        warn(f"vocab: {len(voc['items'])} слів, {len(groups)} груп (перевір за таблицею рівня)")

    # фото
    pics = files.get("pictures")
    if pics:
        for it in pics["items"]:
            hq = it.get("helper_questions", [])
            if not 3 <= len(hq) <= 4:
                err(f"pictures {it['id']}: helper_questions має бути 3–4")
            for q in hq:
                if len(words(q)) > 8:
                    err(f"pictures {it['id']}: питання-опора довше 8 слів: «{q}»")
            for key in ("image_keywords", "image_keywords_alt"):
                n = len(it.get(key, "").split())
                if not 2 <= n <= 4:
                    err(f"pictures {it['id']}: {key} має бути 2–4 слова")
            if it.get("image_keywords") == it.get("image_keywords_alt"):
                err(f"pictures {it['id']}: alt-ключі збігаються з основними")

    # комунікаційні задачі
    comm = files.get("comm-tasks")
    if comm:
        for it in comm["items"]:
            if it.get("mode") == "listen-then-play":
                n = len(it.get("model_dialogue", []))
                if not 10 <= n <= 14:
                    err(f"comm {it['id']}: model_dialogue {n} реплік (норма 10–14)")
            if not 3 <= len(it.get("back_checklist", [])) <= 5:
                err(f"comm {it['id']}: back_checklist має бути 3–5 пунктів")
            if voc and it.get("comm_group"):
                terms = [v["term"].lower().rstrip("!") for v in voc["items"] if v["group"] == it["comm_group"]]
                blob = json.dumps(it, ensure_ascii=False).lower()
                def hit(term):
                    return any(w[: max(3, len(w) - 4)] in blob for w in term.split() if len(w) >= 4)
                hits = sum(1 for t in terms if hit(t))
                if hits < 4:
                    warn(f"comm {it['id']}: схоже, лише {hits} слова з comm_group «{it['comm_group']}» (норма ≥4) — перевір вручну")

    # обсяг тексту Czytanie
    m = re.search(r"## 1\. Czytanie\n(.*?)\[IMAGE", md_text, re.S)
    if m:
        body = m.group(1).split("###", 1)[-1]
        body = body.split("\n", 1)[1] if "\n" in body else body
        warn(f"Czytanie: {len(words(body))} слів (перевір за таблицею рівня)")

    # файл викладача
    if not (pkg / f"{lesson_id}-teacher.md").exists():
        err("немає файлу викладача")
    if not (pkg / f"CURSOR_TASK_{lesson_id}.md").exists():
        err("немає CURSOR_TASK")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(2)
    main(sys.argv[1])
    for w in WARNS:
        print("WARN ", w)
    for e in ERRORS:
        print("ERROR", e)
    print(f"\n{len(ERRORS)} помилок, {len(WARNS)} попереджень")
    sys.exit(1 if ERRORS else 0)
