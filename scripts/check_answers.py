#!/usr/bin/env python3
"""
Several-correct-answers check for published exercise JSON (LESSON_PROTOCOL · «Kilka poprawnych odpowiedzi»).

Usage:
  python3 scripts/check_answers.py pl-b1-group-01-mieszkanie      # one lesson
  python3 scripts/check_answers.py --all                         # every lesson (summary)

ERR  = the student can get stuck (fix before pushing).
WARN = probably more than one correct answer and no accept[] — add the variants or leave it on purpose.
Accepted formats: "answer": "x" + "accept": ["y"]  ·  "answer": ["x", "y"] (first = model answer).
"""
import glob
import json
import os
import re
import sys

ROOT = os.path.join(os.path.dirname(__file__), "..", "src", "content", "queue-published")


def answers(it):
    a = it.get("answer", it.get("right"))
    if isinstance(a, bool) or a is None:
        return None, []
    lst = [str(x) for x in a] if isinstance(a, list) else [str(a)]
    return lst[0] if lst else "", lst[1:] + [str(x) for x in it.get("accept", [])]


def blocks_of(d):
    if isinstance(d.get("blocks"), list):
        for b in d["blocks"]:
            yield b.get("block_id", "?"), b.get("exercise_type") or b.get("task_type"), b.get("items", [])
    if isinstance(d.get("levels"), list):
        for l in d["levels"]:
            yield l.get("block_id", f"g{l.get('level')}"), l.get("task_type"), l.get("items", [])


def check_file(path, errs, warns):
    try:
        d = json.load(open(path, encoding="utf-8"))
    except Exception as e:  # noqa: BLE001
        errs.append(f"{os.path.basename(path)}: JSON nie parsuje się: {e}")
        return
    if not isinstance(d, dict):
        return
    name = os.path.basename(path).replace(".json", "")
    for bid, t, items in blocks_of(d):
        rights = [str(it.get("right")) for it in items if "right" in it]
        for it in items:
            if not isinstance(it, dict):
                continue
            where = f"{name}:{bid}:{it.get('id', '?')}"
            a, acc = answers(it)
            if a is None:
                continue
            if isinstance(it.get("answer"), list) and not it["answer"]:
                errs.append(f"{where}: pusta lista answer")
            opts = it.get("options")
            if opts:
                for x in [a, *acc]:
                    if x not in opts:
                        (errs if x == a else warns).append(f"{where}: {x!r} nie ma w options")
            if "right" in it:
                for x in acc:
                    if x in rights and x != str(it["right"]):
                        errs.append(f"{where}: accept {x!r} to prawa strona innej pary — uczeń utknie")
            if acc or opts or "right" in it:
                continue
            words = len(a.split())
            typed = t in ("fill-in-blank", "open-answer", "text-transform") or (it.get("prompt") and not it.get("words"))
            if it.get("words") and words >= 5:
                warns.append(f"{where}: ułóż zdanie, {words} słów, bez accept[] — inny szyk też poprawny?")
            elif typed and words >= 3 and not re.search(r"_{2,}", a):
                warns.append(f"{where}: {a!r} — inny szyk/synonim też poprawny? dopisz accept[]")


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(2)
    pattern = "*.json" if sys.argv[1] == "--all" else f"{sys.argv[1]}-*.json"
    files = sorted(glob.glob(os.path.join(ROOT, pattern)))
    if not files:
        print(f"brak plików: {pattern}")
        sys.exit(2)
    errs, warns = [], []
    for f in files:
        check_file(f, errs, warns)
    if sys.argv[1] == "--all":
        print(f"{len(files)} plików · ERR {len(errs)} · WARN {len(warns)}")
        for e in errs:
            print("ERR ", e)
    else:
        for e in errs:
            print("ERR ", e)
        for w in warns:
            print("WARN", w)
        print(f"— {len(errs)} ERR · {len(warns)} WARN")
    sys.exit(1 if errs else 0)


if __name__ == "__main__":
    main()
