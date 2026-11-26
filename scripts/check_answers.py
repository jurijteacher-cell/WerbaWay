#!/usr/bin/env python3
"""
Several-correct-answers check for published exercise JSON (LESSON_PROTOCOL · «Kilka poprawnych odpowiedzi»).

Usage:
  python3 scripts/check_answers.py pl-b1-group-01-mieszkanie      # one lesson
  python3 scripts/check_answers.py --all                         # every lesson (summary)

Also checks where the correct answer sits among options (LESSON_PROTOCOL · «Pozycja poprawnej
odpowiedzi»): it must not be always first, always the same, in order, or alternating.
`python3 scripts/shuffle_options.py <id>` fixes the order automatically.

ERR  = the student can get stuck or can guess without knowing the topic (fix before pushing).
WARN = probably more than one correct answer and no accept[] — add the variants or leave it on purpose.
Accepted formats: "answer": "x" + "accept": ["y"]  ·  "answer": ["x", "y"] (first = model answer).
"""
import glob
import json
import string
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


def option_positions(b):
    """Позиції правильної відповіді серед options у блоці: (idxs, sizes, spilny_bank)."""
    idxs, sizes = [], []
    opt_sets = set()
    for it in b.get("items") or []:
        if not isinstance(it, dict):
            continue
        opts = it.get("options")
        if not isinstance(opts, list) or len(opts) < 2:
            continue
        a, _ = answers(it)
        if a is None or a not in opts:
            continue
        idxs.append(opts.index(a))
        sizes.append(len(opts))
        opt_sets.add(tuple(opts))
    return idxs, sizes, len(opt_sets) == 1 and len(idxs) > 1


def position_problem(idxs, sizes, shared=False):
    """Текст проблеми, якщо позицію правильної відповіді можна вгадати без знання теми."""
    if len(idxs) < 3:
        return None
    # Спільний банк на весь блок: керуємо лише порядком банку, а повтори тієї самої
    # відповіді («się» п'ять разів) задані змістом — перевіряємо тільки порядок.
    if not shared:
        if len(set(idxs)) == 1:
            return ("poprawna zawsze na pozycji %d z %d — uczeń zgadnie bez znania tematu"
                    % (idxs[0] + 1, sizes[0]))
        for i in range(len(idxs) - 2):
            if idxs[i] == idxs[i + 1] == idxs[i + 2]:
                return "trzy poprawne pod rząd na tej samej pozycji: %s" % idxs
        if len(idxs) >= 5 and all(idxs[i] == idxs[i + 2] for i in range(len(idxs) - 2)) and idxs[0] != idxs[1]:
            return "poprawne na przemian (1, 2, 1, 2…): %s" % idxs
        if len(idxs) >= 4:
            top = max(idxs.count(p) for p in set(idxs))
            if top / len(idxs) > 0.7:
                return "jedna pozycja ciągnie %d z %d poprawnych: %s" % (top, len(idxs), idxs)
    if len(set(idxs)) > 1:
        if all(idxs[i] <= idxs[i + 1] for i in range(len(idxs) - 1)):
            return "poprawne idą po kolei w dół listy: %s" % idxs
        if all(idxs[i] >= idxs[i + 1] for i in range(len(idxs) - 1)):
            return "poprawne idą po kolei w górę listy: %s" % idxs
    return None


def check_layout(name, b, errs, warns):
    """cloze-text: кожна {id} у тексті має пункт і навпаки; ordering: ≥ 4 події;
    позиція правильної відповіді серед options не вгадується."""
    t = b.get("exercise_type") or b.get("task_type")
    bid = b.get("block_id", "?")
    items = b.get("items", [])
    problem = position_problem(*option_positions(b))
    if problem:
        errs.append(f"{name}:{bid}: {problem} — `python3 scripts/shuffle_options.py {name.rsplit('-', 1)[0]}`")
    if t == "cloze-text":
        gaps = re.findall(r"\{([^}\s]+)\}", b.get("text", ""))
        ids = [str(it.get("id")) for it in items]
        for g in gaps:
            if g not in ids:
                errs.append(f"{name}:{bid}: luka {{{g}}} w tekście bez pozycji w items")
        for i in ids:
            if i not in gaps:
                errs.append(f"{name}:{bid}:{i}: pozycja bez luki {{{i}}} w tekście")
        if len(set(gaps)) != len(gaps):
            errs.append(f"{name}:{bid}: ta sama luka dwa razy w tekście")
    if t == "ordering":
        if len(items) < 4:
            warns.append(f"{name}:{bid}: ordering z {len(items)} zdań — za łatwe (min. 4–6)")
        if any(not it.get("prompt") for it in items):
            errs.append(f"{name}:{bid}: ordering — każde zdanie potrzebuje prompt")


def blocks_of(d):
    if isinstance(d.get("blocks"), list):
        for b in d["blocks"]:
            yield b.get("block_id", "?"), b.get("exercise_type") or b.get("task_type"), b.get("items", [])
    if isinstance(d.get("levels"), list):
        for l in d["levels"]:
            yield l.get("block_id", f"g{l.get('level')}"), l.get("task_type"), l.get("items", [])



def mock_positions(t):
    """Пробний екзамен: позиції правильних відповідей у завданні (idxs, sizes, spilny_bank)."""
    lay = t.get("layout")
    if lay == "mc-passages":
        idxs, sizes = [], []
        for it in t.get("items") or []:
            if not isinstance(it, dict):
                continue
            a, opts = it.get("answer"), it.get("options")
            if not isinstance(opts, list) or len(opts) < 2:
                continue
            if isinstance(a, str) and len(a) == 1 and a in string.ascii_lowercase:
                i = string.ascii_lowercase.index(a)
            elif isinstance(a, str) and a in opts:
                i = opts.index(a)
            else:
                continue
            if i < len(opts):
                idxs.append(i)
                sizes.append(len(opts))
        return idxs, sizes, False
    if lay == "cloze":
        bank = t.get("bank")
        if not isinstance(bank, list) or not bank or not isinstance(bank[0], dict):
            return [], [], True
        keys = [b.get("key") for b in bank]
        idxs = [keys.index(g["answer"]) for g in (t.get("gaps") or []) if isinstance(g, dict) and g.get("answer") in keys]
        return idxs, [len(keys)] * len(idxs), True
    return [], [], False


def check_mock(name, d, errs):
    for sec in d.get("sections") or []:
        if not isinstance(sec, dict):
            continue
        for t in sec.get("tasks") or []:
            if not isinstance(t, dict):
                continue
            problem = position_problem(*mock_positions(t))
            if problem:
                errs.append(
                    f"{name}:{sec.get('id')}/{t.get('id')}: {problem}"
                    f" — `python3 scripts/shuffle_options.py {name.rsplit('-', 1)[0]}`"
                )


def check_file(path, errs, warns):
    try:
        d = json.load(open(path, encoding="utf-8"))
    except Exception as e:  # noqa: BLE001
        errs.append(f"{os.path.basename(path)}: JSON nie parsuje się: {e}")
        return
    if not isinstance(d, dict):
        return
    name = os.path.basename(path).replace(".json", "")
    for key in ("blocks", "levels"):
        value = d.get(key)
        if not isinstance(value, list):
            continue
        for b in value:
            if isinstance(b, dict):
                check_layout(name, b, errs, warns)
    check_mock(name, d, errs)
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
