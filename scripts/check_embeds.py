#!/usr/bin/env python3
"""
Check that a lesson is really published on the site, not only in Notion
(LESSON_PROTOCOL v3.17 · «Вправи є — перевірка обов'язкова»; SITE_PUBLISHING §2, §10).

Checks per lesson id:
  1. src/content/pages/<id>.md exists                       ← the 65/66 failure (Notion only)
  2. its frontmatter has title, module, moduleTitle, cover (level / number / icon → warning)
  3. `module` is a course code that already exists on other pages / in the manifest
     (a typo in `module` hides the lesson from the student and looks like a site bug)
  4. src/content/teacher-pages/<id>.md exists with teacherOf: <id>
  5. every <embed> of the page has its JSON (and the blocks named in ?blocks=)
  6. vocab / comm-tasks / hw exist (without any of them no window opens)
  7. the lesson is listed in content-queue/_manifest.json (warning — the site does not read it)

Usage:
  python3 scripts/check_embeds.py pl-a2-56-co-sie-stalo [more lesson_ids]
  python3 scripts/check_embeds.py --pages                # every page in src/content/pages
  python3 scripts/check_embeds.py --manifest             # every lesson in the manifest
  python3 scripts/check_embeds.py --page page.md         # embeds parsed from a fetched Notion page
  python3 scripts/check_embeds.py --changed [base]       # only lessons touched vs base (default origin/main) — CI gate
  --remote              check origin/main (git ls-tree) instead of the working tree
  --new-module <code>   accept this course code as new (first lesson of a new course)
  --notion-only         lesson lives in Notion only: skip checks 1-4, 7 (exercises still checked)
  --strict              treat warnings as failures

Exit code 1 if anything is missing → fix and push before saying «готово».
"""
import json
import os
import re
import subprocess
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
QP = "src/content/queue-published"
PAGES = "src/content/pages"
TEACHER = "src/content/teacher-pages"
MANIFEST = "content-queue/_manifest.json"
EMBED_RE = re.compile(r"(?:werba-way\.vercel\.app|werbaway\.com)/embed/([a-z0-9-]+)/([a-z-]+)(?:\?blocks=([a-z0-9,\-]+))?")
SLUG_RE = re.compile(r"^[a-z0-9][a-z0-9-]*$")  # src/lib/pages/pages.ts
REQUIRED = ("vocab", "comm-tasks", "hw")  # without any of these no window of the lesson opens
# frontmatter the site actually uses: module carries access, cover fills the card in /learn
FRONTMATTER = ("title", "module", "moduleTitle", "cover")
# useful but not fatal: without `number` the lesson just sorts last
FRONTMATTER_SOFT = ("level", "number", "icon")
# these windows are built by the app (src/lib/mock-exam, /api/placement), not from queue-published
APP_SERVED = ("mock-exam", "placement")


def expand(spec):
    out = []
    for part in spec.split(","):
        m = re.fullmatch(r"([a-z]+)(\d+)-(?:[a-z]+)?(\d+)", part)
        if m:
            out += [f"{m.group(1)}{i}" for i in range(int(m.group(2)), int(m.group(3)) + 1)]
        elif part:
            out.append(part)
    return out


def git(*args):
    return subprocess.run(["git", "-C", ROOT, *args], capture_output=True, text=True)


def remote_files():
    git("fetch", "-q", "--depth", "1", "origin", "main")
    r = git("ls-tree", "-r", "--name-only", "origin/main", QP, PAGES, TEACHER)
    return set(r.stdout.split())


def read(path, remote):
    """File contents as text, or None when the file is not there."""
    if remote:
        r = git("show", f"origin/main:{path}")
        return r.stdout if r.returncode == 0 else None
    full = os.path.join(ROOT, path)
    if not os.path.exists(full):
        return None
    with open(full, encoding="utf-8") as f:
        return f.read()


def load(path, remote):
    raw = read(path, remote)
    if raw is None:
        return None
    try:
        return json.loads(raw)
    except json.JSONDecodeError as e:
        return {"__broken__": str(e)}


def frontmatter(raw):
    m = re.match(r"^---\n(.*?)\n---\n?", raw, re.S)
    data = {}
    for line in (m.group(1) if m else "").split("\n"):
        i = line.find(":")
        if i > 0:
            data[line[:i].strip()] = line[i + 1:].strip()
    return data


def list_pages(remote):
    if remote:
        return sorted(
            os.path.basename(p)[:-3]
            for p in git("ls-tree", "-r", "--name-only", "origin/main", PAGES).stdout.split()
            if p.endswith(".md") and not os.path.basename(p).startswith("_")
        )
    d = os.path.join(ROOT, PAGES)
    return sorted(f[:-3] for f in os.listdir(d) if f.endswith(".md") and not f.startswith("_"))


def manifest_lessons(remote):
    raw = read(MANIFEST, remote)
    if raw is None:
        return {}
    try:
        man = json.loads(raw)
    except json.JSONDecodeError:
        return {}
    items = man if isinstance(man, list) else man.get("lessons", man.get("items", []))
    out = {}
    for x in items:
        lid = x.get("lesson_id") or x.get("id")
        if lid:
            out[lid] = x
    return out


def known_modules(remote, extra):
    """Course codes already in use: other pages' `module` + the manifest."""
    codes = {}
    for slug in list_pages(remote):
        raw = read(f"{PAGES}/{slug}.md", remote)
        code = frontmatter(raw or "").get("module")
        if code:
            codes[code] = codes.get(code, 0) + 1
    for x in manifest_lessons(remote).values():
        code = x.get("module")
        if code:
            codes[code] = codes.get(code, 0) + 1
    for code in extra:
        codes[code] = codes.get(code, 0) + 1
    return codes


def check_lesson(lid, kinds, remote, files, modules, manifest, notion_only):
    """Everything that must be true for the lesson to open at /learn/<lid>. → (problems, warnings)"""
    problems, warnings = [], []
    page_raw = None

    if not SLUG_RE.match(lid):
        problems.append(f"id «{lid}» не проходить ^[a-z0-9][a-z0-9-]*$ — сторінка не завантажиться")

    if not notion_only:
        page_raw = read(f"{PAGES}/{lid}.md", remote)
        if page_raw is None:
            problems.append(f"немає {PAGES}/{lid}.md — на сайті лекції НЕМА (як 65/66)")
        else:
            fm = frontmatter(page_raw)
            missing = [k for k in FRONTMATTER if not fm.get(k)]
            if missing:
                problems.append("frontmatter без " + ", ".join(missing))
            soft = [k for k in FRONTMATTER_SOFT if not fm.get(k)]
            if soft:
                warnings.append("frontmatter без " + ", ".join(soft) + " (number — порядок у /learn)")
            code = fm.get("module")
            if code and code not in modules:
                near = ", ".join(sorted(modules)[:6])
                problems.append(
                    f"module «{code}» більше ніде не зустрічається — учень лекції не побачить. "
                    f"Є: {near}… Новий курс? --new-module {code}"
                )
            if fm.get("number") and not re.fullmatch(r"\d+", fm["number"]):
                problems.append(f"number «{fm['number']}» не число — лекція стане в кінець списку")
            if fm.get("cover") and "images.unsplash.com" not in fm["cover"]:
                warnings.append("cover не з images.unsplash.com")

        teacher_raw = read(f"{TEACHER}/{lid}.md", remote)
        if teacher_raw is None:
            problems.append(f"немає {TEACHER}/{lid}.md")
        elif frontmatter(teacher_raw).get("teacherOf") != lid:
            problems.append(f"сторінка викладача без teacherOf: {lid}")

        if lid not in manifest:
            warnings.append(f"немає запису в {MANIFEST} (сайт працює, але реєстр неповний)")

    # embeds of the page itself, on top of whatever came from the command line
    want = {k: set(v) for k, v in kinds.items()}
    if page_raw:
        for eid, kind, blocks in EMBED_RE.findall(page_raw):
            if eid != lid:
                problems.append(f"embed чужого уроку: {eid}/{kind}")
                continue
            want.setdefault(kind, set()).update(expand(blocks) if blocks else [])

    # a mock exam / placement page is a lesson of its own: it needs no vocab, comm-tasks or hw
    standalone = any(load(f"{QP}/{lid}-{s}.json", remote) is not None for s in ("test", "mock")) or (
        bool(want) and set(want) <= set(APP_SERVED)
    )
    for k in sorted((set() if standalone else set(REQUIRED)) | set(want)):
        if k in APP_SERVED:
            continue
        path = f"{QP}/{lid}-{k}.json"
        if remote and files is not None and path not in files:
            problems.append(f"немає {k}.json")
            continue
        d = load(path, remote)
        if d is None:
            problems.append(f"немає {k}.json")
            continue
        if "__broken__" in d:
            problems.append(f"{k}.json не парситься: {d['__broken__']}")
            continue
        have = {b.get("block_id") for b in d.get("blocks", [])}
        miss = sorted(want.get(k, set()) - have)
        if miss:
            problems.append(f"{k}.json без блоків {','.join(miss)}")
    return problems, warnings


def changed_lessons(base):
    """Lesson ids touched in this branch — the CI gate runs on these only, not on legacy content."""
    git("fetch", "-q", "--depth", "50", "origin", base.split("/")[-1])
    merge_base = git("merge-base", "HEAD", base).stdout.strip() or base
    r = git("diff", "--name-only", merge_base, "HEAD")
    out = set()
    for path in r.stdout.split():
        name = os.path.basename(path)
        if path.startswith((PAGES + "/", TEACHER + "/")) and name.endswith(".md") and not name.startswith("_"):
            out.add(name[:-3])
        elif path.startswith(QP + "/") and name.endswith(".json"):
            m = re.fullmatch(r"(.+?)-(?:vocab|grammar|hw|comm-tasks|exam|slides|pictures|notes|test|mock)\.json", name)
            if m:
                out.add(m.group(1))
    return sorted(out)


def main(argv):
    remote = "--remote" in argv
    notion_only = "--notion-only" in argv
    strict = "--strict" in argv
    extra_modules = [argv[i + 1] for i, a in enumerate(argv) if a == "--new-module" and i + 1 < len(argv)]
    skip = set(extra_modules)
    argv = [a for a in argv if a not in ("--remote", "--notion-only", "--new-module", "--strict") and a not in skip]

    wanted = {}  # lesson_id -> {kind: set(blocks)}
    if argv and argv[0] == "--page":
        text = open(argv[1], encoding="utf-8").read()
        for lid, kind, blocks in EMBED_RE.findall(text):
            wanted.setdefault(lid, {}).setdefault(kind, set()).update(expand(blocks) if blocks else [])
    elif argv and argv[0] == "--manifest":
        for lid in manifest_lessons(remote):
            wanted.setdefault(lid, {})
    elif argv and argv[0] == "--changed":
        base = argv[1] if len(argv) > 1 else "origin/main"
        ids = changed_lessons(base)
        if not ids:
            print(f"немає змінених лекцій щодо {base} — нічого перевіряти")
            return 0
        for lid in ids:
            wanted.setdefault(lid, {})
    elif argv and argv[0] == "--pages":
        for lid in list_pages(remote):
            wanted.setdefault(lid, {})
    elif argv:
        for lid in argv:
            wanted.setdefault(lid, {})
    else:
        print(__doc__)
        return 2

    files = remote_files() if remote else None
    modules = known_modules(remote, extra_modules)
    manifest = manifest_lessons(remote)

    bad = warned = 0
    for lid, kinds in sorted(wanted.items()):
        problems, warnings = check_lesson(lid, kinds, remote, files, modules, manifest, notion_only)
        if problems:
            bad += 1
            print(f"✗ {lid}:")
        elif warnings:
            warned += 1
            print(f"⚠ {lid}:")
        else:
            print(f"✓ {lid}")
        for x in problems:
            print(f"    {x}")
        for x in warnings:
            print(f"    ⚠ {x}")
    where = "origin/main" if remote else "working tree"
    tail = f"{bad} lesson(s) with problems" if bad else ("OK" if not warned else f"OK, {warned} with warnings")
    print(f"\n{tail} ({where})")
    return 1 if bad or (strict and warned) else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
