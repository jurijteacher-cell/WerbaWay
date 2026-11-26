#!/usr/bin/env python3
"""
Переставляє варіанти відповідей у вправах так, щоб правильна не стояла завжди першою
і щоб правильні не йшли по порядку (LESSON_PROTOCOL · «Позиція правильної відповіді»).

  python3 scripts/shuffle_options.py --all            # усі уроки
  python3 scripts/shuffle_options.py pl-b1-group-01-mieszkanie
  python3 scripts/shuffle_options.py --all --check    # лише показати, нічого не писати

Що робить:
  • варіанти в items[].options перемішує детерміновано (сід = block_id + id),
    цільову позицію правильної відповіді вибирає так, щоб у блоці був розкид:
    не всі однакові, без трьох однакових поспіль, частка 1-ї позиції ≤ 50%;
  • спільний банк (однакові options у всіх пунктів блоку, поле bank) перемішує
    один раз на блок — усі пункти бачать той самий порядок;
  • банк із літерами «a) …, b) …» переставляє зміст між літерами, літери лишаються
    за алфавітом, answer/accept/bank переписуються під нові літери;
  • texts, explanation, grammar_point, accept не чіпає; значення відповідей ті самі.
Переклади (src/content/i18n/exercises) прив'язані до хешу тексту, не до позиції,
тому перестановка їх не ламає.
"""
import copy
import glob
import json
import os
import random
import re
import string
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from check_answers import position_problem  # noqa: E402

ROOT = os.path.join(os.path.dirname(__file__), "..", "src", "content", "queue-published")
LET = re.compile(r"^([a-zA-Z])\)\s+(.*)$", re.S)


def model(it):
    a = it.get("answer")
    if isinstance(a, list):
        return str(a[0]) if a else None
    return None if isinstance(a, bool) or a is None else str(a)


def spread_ok(idxs, sizes, shared=False):
    """Те саме правило, що й у воротах check_answers.py — одне визначення на репо."""
    return position_problem(idxs, sizes, shared) is None


def deviation(idxs, sizes):
    """Відхилення розподілу позицій від рівномірного (0 = ідеально рівно)."""
    if not idxs:
        return 0.0
    n = max(sizes)
    exp = [0.0] * n
    for size in sizes:
        for p in range(size):
            exp[p] += 1.0 / size
    got = [0.0] * n
    for i in idxs:
        got[i] += 1.0
    return sum((got[p] - exp[p]) ** 2 for p in range(n)) / len(idxs)


def pick(candidates, sizes, shared=False):
    """Перший варіант, що не вгадується і достатньо рівний; далі — найрівніший із тих,
    що не вгадуються; якщо таких немає (мало пунктів) — просто найрівніший."""
    best = best_ok = None
    for idxs, payload in candidates:
        dev = deviation(idxs, sizes)
        ok = spread_ok(idxs, sizes, shared)
        if best is None or dev < best[0]:
            best = (dev, idxs, payload)
        if ok and (best_ok is None or dev < best_ok[0]):
            best_ok = (dev, idxs, payload)
        if ok and dev <= 0.35:
            return idxs, payload
    chosen = best_ok or best
    return chosen[1], chosen[2]


def shuffle_per_item(block_id, items, rng):
    """Кожен пункт має власний набір варіантів: ставимо правильну на цільову позицію."""
    sizes = [len(it["options"]) for it in items]
    cands = []
    for _ in range(400):
        plan = [rng.randrange(n) for n in sizes]
        cands.append((plan, plan))
    plan, _ = pick(cands, sizes, False)
    for it, target in zip(items, plan):
        ans = model(it)
        rest = [o for o in it["options"] if o != ans]
        rng.shuffle(rest)
        it["options"] = rest[:target] + [ans] + rest[target:]
    return plan


def shuffle_shared(block, items, rng):
    """Спільний банк: один порядок на весь блок."""
    opts = list(items[0]["options"])
    letters = [LET.match(o) for o in opts]
    lettered = all(letters) and len({m.group(1).lower() for m in letters}) == len(opts)
    bodies = [m.group(2) for m in letters] if lettered else opts
    labels = [m.group(1) for m in letters] if lettered else None
    answers = [model(it) for it in items]
    sizes = [len(opts)] * len(items)

    cands = []
    for _ in range(600):
        perm = list(range(len(bodies)))
        rng.shuffle(perm)
        if lettered:
            new = [f"{labels[i]}) {bodies[perm[i]]}" for i in range(len(bodies))]
            body_to_new = {bodies[perm[i]]: new[i] for i in range(len(bodies))}
            idxs = [new.index(body_to_new[LET.match(a).group(2)]) for a in answers]
        else:
            new = [bodies[i] for i in perm]
            idxs = [new.index(a) for a in answers]
        cands.append((idxs, (new, perm)))
    idxs, (new, perm) = pick(cands, sizes, True)

    if lettered:
        body_to_new = {bodies[perm[i]]: new[i] for i in range(len(bodies))}
        remap = {f"{labels[i]}) {bodies[i]}": body_to_new[bodies[i]] for i in range(len(bodies))}
        remap_loose = {bodies[i]: body_to_new[bodies[i]] for i in range(len(bodies))}
        for it in items:
            it["options"] = list(new)
            for field in ("answer", "accept"):
                v = it.get(field)
                if isinstance(v, str):
                    it[field] = remap.get(v, remap_loose.get(LET.match(v).group(2), v) if LET.match(v) else v)
                elif isinstance(v, list):
                    it[field] = [
                        remap.get(x, remap_loose.get(LET.match(x).group(2), x) if LET.match(x) else x) for x in v
                    ]
        if isinstance(block.get("bank"), list):
            if {LET.match(x).group(2) for x in block["bank"] if LET.match(x)} == set(bodies):
                block["bank"] = list(new)
            else:
                block["bank"] = [remap.get(x, x) for x in block["bank"]]
    else:
        for it in items:
            it["options"] = list(new)
        if isinstance(block.get("bank"), list) and set(block["bank"]) == set(opts):
            block["bank"] = list(new)
    return idxs


def process_block(b, rng_seed):
    items = [
        it
        for it in (b.get("items") or [])
        if isinstance(it, dict)
        and isinstance(it.get("options"), list)
        and len(it["options"]) > 1
        and model(it) in (it.get("options") or [])
    ]
    if len(items) < 2:
        return None
    rng = random.Random(rng_seed)
    sizes = [len(it["options"]) for it in items]
    before = [it["options"].index(model(it)) for it in items]
    shared = len({tuple(it["options"]) for it in items}) == 1
    after = shuffle_shared(b, items, rng) if shared else shuffle_per_item(b.get("block_id"), items, rng)
    return before, after, sizes, shared



def process_mock_task(t, rng_seed):
    """Пробний екзамен: mc-passages (answer = літера) і cloze (bank {key,text} + gaps)."""
    lay = t.get("layout")
    rng = random.Random(rng_seed)
    if lay == "mc-passages":
        items = [
            it
            for it in (t.get("items") or [])
            if isinstance(it, dict)
            and isinstance(it.get("options"), list)
            and len(it["options"]) > 1
            and isinstance(it.get("answer"), str)
            and len(it["answer"]) == 1
            and string.ascii_lowercase.index(it["answer"]) < len(it["options"])
        ]
        if len(items) < 2:
            return None
        sizes = [len(it["options"]) for it in items]
        before = [string.ascii_lowercase.index(it["answer"]) for it in items]
        cands = []
        for _ in range(400):
            plan = [rng.randrange(n) for n in sizes]
            cands.append((plan, plan))
        plan, _ = pick(cands, sizes, False)
        for it, old, target in zip(items, before, plan):
            correct = it["options"][old]
            rest = [o for i, o in enumerate(it["options"]) if i != old]
            rng.shuffle(rest)
            it["options"] = rest[:target] + [correct] + rest[target:]
            it["answer"] = string.ascii_lowercase[target]
        return before, plan, sizes, False
    if lay == "cloze":
        bank = t.get("bank")
        gaps = [g for g in (t.get("gaps") or []) if isinstance(g, dict)]
        if not isinstance(bank, list) or not bank or not isinstance(bank[0], dict):
            return None
        keys = [b.get("key") for b in bank]
        answers_ = [g.get("answer") for g in gaps if g.get("answer") in keys]
        if len(answers_) < 3:
            return None
        texts = [b.get("text") for b in bank]
        sizes = [len(keys)] * len(answers_)
        before = [keys.index(a) for a in answers_]
        cands = []
        for _ in range(600):
            perm = list(range(len(texts)))
            rng.shuffle(perm)
            # текст, що був під keys[perm[i]], стає під keys[i]
            newkey = {perm[i]: keys[i] for i in range(len(texts))}
            idxs = [keys.index(newkey[keys.index(a)]) for a in answers_]
            cands.append((idxs, perm))
        idxs, perm = pick(cands, sizes, True)
        newkey = {perm[i]: keys[i] for i in range(len(texts))}
        for i, b in enumerate(bank):
            b["text"] = texts[perm[i]]
        for g in gaps:
            if g.get("answer") in keys:
                g["answer"] = newkey[keys.index(g["answer"])]
        return before, idxs, sizes, True
    return None


def process_file(path, write=True):
    with open(path, encoding="utf-8") as fh:
        raw = fh.read()
    d = json.loads(raw)
    if not isinstance(d, dict):
        return []
    name = os.path.basename(path).replace(".json", "")
    original = copy.deepcopy(d)
    report = []
    for sec in d.get("sections") or []:
        if not isinstance(sec, dict):
            continue
        for t in sec.get("tasks") or []:
            if not isinstance(t, dict):
                continue
            tid = f"{sec.get('id')}/{t.get('id')}"
            res = process_mock_task(t, f"{name}:{tid}")
            if res:
                before, after, sizes, shared = res
                report.append((tid, before, after, spread_ok(after, sizes, shared)))
    for key in ("blocks", "levels"):
        value = d.get(key)
        if not isinstance(value, list):
            continue
        for b in value:
            if not isinstance(b, dict):
                continue
            bid = b.get("block_id") or f"g{b.get('level', '?')}"
            res = process_block(b, f"{name}:{bid}")
            if res:
                before, after, sizes, shared = res
                report.append((bid, before, after, spread_ok(after, sizes, shared)))
    if d == original:
        return report
    lines = raw.splitlines(True)
    indent = (len(lines[1]) - len(lines[1].lstrip())) if len(lines) > 1 else 2
    new = json.dumps(d, ensure_ascii=False, indent=indent or 2) + ("\n" if raw.endswith("\n") else "")
    if write and new != raw:
        with open(path, "w", encoding="utf-8") as fh:
            fh.write(new)
    return report


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    flags = {a for a in sys.argv[1:] if a.startswith("--")}
    if not args and "--all" not in flags:
        print(__doc__)
        sys.exit(2)
    pattern = "*.json" if "--all" in flags else f"{args[0]}-*.json"
    files = sorted(glob.glob(os.path.join(ROOT, pattern)))
    if not files:
        print(f"brak plików: {pattern}")
        sys.exit(2)
    blocks = fixed = bad = 0
    for f in files:
        for bid, before, after, ok in process_file(f, write="--check" not in flags):
            blocks += 1
            if before != after:
                fixed += 1
            if not ok:
                bad += 1
                print(f"WARN {os.path.basename(f)}:{bid}: {after} — позиція все ще вгадувана (мало варіантів?)")
    print(f"{len(files)} файлів · {blocks} блоків із варіантами · переставлено {fixed} · слабкий розкид {bad}")


if __name__ == "__main__":
    main()
