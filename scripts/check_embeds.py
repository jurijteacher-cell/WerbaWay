#!/usr/bin/env python3
"""
Check that every exercise window (embed) of a lesson has its JSON in the repo
(LESSON_PROTOCOL v3.17 · «Вправи є — перевірка обов'язкова»).

Usage:
  python3 scripts/check_embeds.py pl-a2-56-co-sie-stalo [more lesson_ids]
  python3 scripts/check_embeds.py --page page.md        # embeds parsed from a fetched Notion page
  python3 scripts/check_embeds.py --manifest             # every lesson in content-queue/_manifest.json
  add --remote to check origin/main (git ls-tree) instead of the working tree

Exit code 1 if anything is missing → restore the JSON and push before saying «готово».
"""
import json
import os
import re
import subprocess
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
QP = "src/content/queue-published"
EMBED_RE = re.compile(r"werba-way\.vercel\.app/embed/([a-z0-9-]+)/([a-z-]+)(?:\?blocks=([a-z0-9,\-]+))?")
REQUIRED = ("vocab", "comm-tasks", "hw")  # without any of these no window of the lesson opens
FILE_OF = {"mock-exam": "mock"}  # embed kind -> file suffix when they differ


def expand(spec):
    out = []
    for part in spec.split(","):
        m = re.fullmatch(r"([a-z]+)(\d+)-(?:[a-z]+)?(\d+)", part)
        if m:
            out += [f"{m.group(1)}{i}" for i in range(int(m.group(2)), int(m.group(3)) + 1)]
        elif part:
            out.append(part)
    return out


def remote_files():
    subprocess.run(["git", "-C", ROOT, "fetch", "-q", "--depth", "1", "origin", "main"], check=False)
    r = subprocess.run(["git", "-C", ROOT, "ls-tree", "-r", "--name-only", "origin/main", QP],
                       capture_output=True, text=True)
    return set(r.stdout.split())


def load(path, remote):
    if remote:
        r = subprocess.run(["git", "-C", ROOT, "show", f"origin/main:{path}"], capture_output=True, text=True)
        return json.loads(r.stdout) if r.returncode == 0 else None
    full = os.path.join(ROOT, path)
    return json.load(open(full, encoding="utf-8")) if os.path.exists(full) else None


def main(argv):
    remote = "--remote" in argv
    argv = [a for a in argv if a != "--remote"]
    wanted = {}  # lesson_id -> {kind: set(blocks)}
    if argv and argv[0] == "--page":
        text = open(argv[1], encoding="utf-8").read()
        for lid, kind, blocks in EMBED_RE.findall(text):
            wanted.setdefault(lid, {}).setdefault(kind, set()).update(expand(blocks) if blocks else [])
    elif argv and argv[0] == "--manifest":
        man = json.load(open(os.path.join(ROOT, "content-queue/_manifest.json"), encoding="utf-8"))
        items = man if isinstance(man, list) else man.get("lessons", man.get("items", []))
        for x in items:
            lid = x.get("lesson_id") or x.get("id")
            if lid:
                wanted.setdefault(lid, {})
    elif argv:
        for lid in argv:
            wanted.setdefault(lid, {})
    else:
        print(__doc__)
        return 2

    files = remote_files() if remote else None
    bad = 0
    for lid, kinds in sorted(wanted.items()):
        problems = []
        standalone = any(load(f"{QP}/{lid}-{s}.json", remote) is not None for s in ("test", "mock"))
        for k in (set() if standalone else set(REQUIRED)) | set(kinds):
            path = f"{QP}/{lid}-{FILE_OF.get(k, k)}.json"
            if remote and path not in files:
                problems.append(f"немає {k}.json")
                continue
            d = load(path, remote)
            if d is None:
                problems.append(f"немає {k}.json")
                continue
            have = {b.get("block_id") for b in d.get("blocks", [])}
            miss = sorted(kinds.get(k, set()) - have)
            if miss:
                problems.append(f"{k}.json без блоків {','.join(miss)}")
        if problems:
            bad += 1
            print(f"✗ {lid}: " + "; ".join(problems))
        else:
            print(f"✓ {lid}")
    print(f"\n{'OK' if not bad else f'{bad} lesson(s) with missing exercises'} ({'origin/main' if remote else 'working tree'})")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
