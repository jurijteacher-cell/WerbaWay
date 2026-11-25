#!/usr/bin/env python3
"""
Структурні ворота лекції (LESSON_PROTOCOL v4.0 · GRAMMAR_METHOD v1.0).

  python3 scripts/check_lecture.py <lesson_id> [<lesson_id> ...]   # суворо: ERR → код 1
  python3 scripts/check_lecture.py --changed                       # лекції, змінені відносно origin/main
  python3 scripts/check_lecture.py --audit                         # усі лекції, лише таблиця порушень

Перевіряє:
  1. файли: сторінка учня, TEACHER, vocab/comm-tasks/hw, запис у маніфесті (WARN)
  2. цикл граматики: теорія не йде купою без вправ; блок винятків має вправи; є збірний блок `gz`
  3. пастки: ✗ ≠ ✓, укр/рос-колонка з кирилицею, «Dlaczego» непорожнє, ≤ 6 (мінімуму немає)
  4. слухання: у лекціях його НЕМАЄ (CLAUDE.md п. 6, 25.11): жодних audio_id / audio_url / exam_skill=sluchanie,
     `<audio>`-плеєрів, mode listen-then-play і «nauczyciel czyta / posłuchaj». Аудіювання — лише в пробних екзаменах
Виводить лише ERR/WARN (економія токенів).
"""
import json
import os
import re
import subprocess
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PAGES = os.path.join(ROOT, "src/content/pages")
TEACHER = os.path.join(ROOT, "src/content/teacher-pages")
QP = os.path.join(ROOT, "src/content/queue-published")
MANIFEST = os.path.join(ROOT, "content-queue/_manifest.json")
AUDIO_READY = os.path.join(ROOT, "content-queue/audio-ready.json")
CYR = re.compile(r"[А-Яа-яІіЇїЄєҐґЁё]")
MAX_THEORY_RUN = 3


def rd(path):
    try:
        with open(path, encoding="utf-8") as f:
            return f.read()
    except OSError:
        return None


def jload(path):
    t = rd(path)
    if t is None:
        return None
    try:
        return json.loads(t)
    except ValueError:
        return None


def norm(s):
    s = re.sub(r"<[^>]+>", "", s)
    s = re.sub(r"[✗✓*_`~]", "", s)
    s = re.sub(r"[^\w\s]", "", s.lower())
    return " ".join(s.split())


def grammar_sections(body):
    """Розділи `## …Gramatyk…` → [(назва, [рядки])]."""
    out, cur = [], None
    for line in body.split("\n"):
        if line.startswith("## "):
            cur = (line, []) if re.search(r"[Gg]ramatyk", line) else None
            if cur:
                out.append(cur)
            continue
        if cur is not None:
            cur[1].append(line)
    return out


def check_cycle(lines, title, errs, warns):
    """Теорія (###) → embed grammar; не більше MAX_THEORY_RUN підряд; винятки без вправ — ERR."""
    run, run_max, theory, embeds = 0, 0, 0, 0
    pending_exc = None
    for ln in lines:
        if ln.startswith("### "):
            kind = "exc" if re.search(r"[Ww]yj[ąa]tk", ln) else "trap" if re.search(r"[Pp]u[łl]apk|Typowe błędy|Traps", ln) else "theory"
            if pending_exc and kind != "trap":
                errs.append(f"{title}: блок винятків «{pending_exc}» без вправ перед наступним блоком")
                pending_exc = None
            if kind == "theory":
                run += 1
                theory += 1
                run_max = max(run_max, run)
            elif kind == "exc":
                pending_exc = ln.strip("# ").strip()
        if re.search(r"<embed\b[^>]*/embed/[^/]+/grammar", ln):
            embeds += 1
            run = 0
            pending_exc = None
    if pending_exc:
        errs.append(f"{title}: блок винятків «{pending_exc}» без вправ")
    if theory and embeds == 0:
        errs.append(f"{title}: теорія без жодних вправ")
    if run_max > MAX_THEORY_RUN:
        errs.append(f"{title}: {run_max} блоки теорії поспіль без вправ (максимум {MAX_THEORY_RUN}) — поділи на порції")
    if re.search(r"cz[ęe]ść\s*\d", title):
        warns.append(f"{title}: розділ «część N» — ріж на порції «теорія → вправи» (GRAMMAR_METHOD §1)")
    return run_max, theory, embeds


def check_traps(body, errs):
    in_trap, n = False, 0
    for ln in body.split("\n"):
        if ln.startswith("#"):
            in_trap = bool(re.search(r"[Pp]u[łl]apk|Typowe błędy|Traps", ln))
            continue
        if not in_trap or not ln.strip().startswith("|"):
            continue
        cells = [c.strip() for c in ln.strip().strip("|").split("|")]
        if len(cells) < 4 or set("".join(cells)) <= set("-: "):
            continue
        if re.search(r"Po (ukraińsku|rosyjsku)|English|Typowe|Why|Dlaczego", cells[0] + cells[-1]) and not CYR.search(cells[0]) and "✗" in cells[1]:
            continue  # шапка
        n += 1
        uk, wrong, right, why = cells[0], cells[1], cells[2], cells[3]
        if not CYR.search(uk) and not re.search(r"[a-z]", uk):
            errs.append(f"пастка «{uk[:40]}»: порожня колонка мови учня")
        elif not CYR.search(uk):
            pass  # EN-формат: мова учня латиницею
        if norm(wrong) == norm(right):
            errs.append(f"пастка «{uk[:40]}»: ✗ і ✓ збігаються — це не пастка")
        if len(why.strip()) < 12:
            errs.append(f"пастка «{uk[:40]}»: «Dlaczego» порожнє або порожні слова — назви механізм")
    if n > 6:
        errs.append(f"пасток {n} (> 6): залиш лише справжні")
    return n


def check_files(lid, errs, warns):
    if rd(os.path.join(PAGES, lid + ".md")) is None:
        errs.append("немає src/content/pages/%s.md" % lid)
    t = rd(os.path.join(TEACHER, lid + ".md"))
    if t is None:
        errs.append("немає src/content/teacher-pages/%s.md" % lid)
    elif "teacherOf" not in t[:600]:
        errs.append("TEACHER без teacherOf")
    for k in ("vocab", "comm-tasks", "hw"):
        if not os.path.exists(os.path.join(QP, f"{lid}-{k}.json")):
            errs.append(f"немає {lid}-{k}.json — вікна уроку не відкриються")
    man = jload(MANIFEST) or {}
    if not any(x.get("lesson_id") == lid for x in man.get("lessons", [])):
        warns.append("немає запису в content-queue/_manifest.json")


def listening_blocks(lid):
    res = []
    for fn in sorted(os.listdir(QP)):
        if not fn.startswith(lid + "-") or not fn.endswith(".json"):
            continue
        d = jload(os.path.join(QP, fn))
        if not isinstance(d, dict):
            continue
        for b in d.get("blocks", []) or []:
            if b.get("audio_id") or b.get("audio_url") or b.get("exam_skill") == "sluchanie":
                res.append((fn, b.get("block_id"), b.get("audio_id")))
    return res


LISTEN_TXT = re.compile(r"[Pp]osłuchaj|czyta nauczyciel|[Nn]auczyciel (czyta|przeczyta|odczyta|dyktuje)|<audio\b|Słuchanie jak na egzaminie", re.I)


def check_audio(lid, errs):
    """Лекція без аудіювання: ні блоків, ні плеєрів, ні «nauczyciel czyta». Пробні екзамени (`*-probny-*`) — виняток."""
    if "-probny-" in lid:
        return
    for fn, bid, aid in listening_blocks(lid):
        errs.append(f"{fn}:{bid}: у лекції не може бути слухання — аудіювання лише в пробних екзаменах")
    for fn in sorted(os.listdir(QP)):
        if not fn.startswith(lid + "-") or not fn.endswith("-comm-tasks.json"):
            continue
        d = jload(os.path.join(QP, fn)) or {}
        for it in d.get("items", []) or []:
            if it.get("mode") == "listen-then-play" or it.get("audio_url"):
                errs.append(f"{fn}:{it.get('id')}: mode listen-then-play / audio_url — заборонено, ставте read-then-play")
            if LISTEN_TXT.search(it.get("back_scenario", "")):
                errs.append(f"{fn}:{it.get('id')}: у back_scenario «posłuchaj / czyta nauczyciel» — заборонено")
    page = rd(os.path.join(PAGES, lid + ".md")) or ""
    m = LISTEN_TXT.search(re.sub(r"<embed.*?</embed>", "", page, flags=re.S))
    if m:
        errs.append(f"сторінка: «{m.group(0)}» — у лекції немає слухання й плеєрів")


def check_gz(lid, errs):
    d = jload(os.path.join(QP, lid + "-grammar.json"))
    if d is None:
        return
    ids = [b.get("block_id") for b in d.get("blocks", [])]
    if "gz" not in ids:
        errs.append("у grammar.json немає збірного блоку `gz` (GRAMMAR_METHOD §1.5)")


def check_one(lid, strict_gz=True):
    errs, warns = [], []
    check_files(lid, errs, warns)
    page = rd(os.path.join(PAGES, lid + ".md")) or ""
    body = re.sub(r"^---\n.*?\n---\n", "", page, count=1, flags=re.S)
    stats = {"run": 0, "traps": 0, "gz": True, "audio": 0}
    secs = grammar_sections(body)
    for title, lines in secs:
        r, _, _ = check_cycle(lines, title.strip("# ").strip(), errs, warns)
        stats["run"] = max(stats["run"], r)
    stats["traps"] = check_traps(body, errs)
    if secs and strict_gz:
        before = len(errs)
        check_gz(lid, errs)
        stats["gz"] = len(errs) == before
    before = len(errs)
    check_audio(lid, errs)
    stats["audio"] = len(errs) - before
    return errs, warns, stats


def lessons_all():
    return sorted(f[:-3] for f in os.listdir(PAGES) if f.endswith(".md") and not f.startswith("_"))


def lessons_changed():
    try:
        out = subprocess.run(["git", "diff", "--name-only", "origin/main", "--", "src/content"], cwd=ROOT,
                             capture_output=True, text=True).stdout
        out += subprocess.run(["git", "status", "--porcelain", "--", "src/content"], cwd=ROOT,
                              capture_output=True, text=True).stdout
    except OSError:
        return []
    ids = set()
    for ln in out.splitlines():
        m = re.search(r"src/content/(?:pages|teacher-pages)/([a-z0-9-]+)\.md", ln) or \
            re.search(r"src/content/queue-published/([a-z0-9-]+?)-(?:vocab|grammar|hw|comm-tasks|exam)\.json", ln)
        if m:
            ids.add(m.group(1))
    return sorted(ids)


def main(argv):
    if not argv:
        print(__doc__)
        return 2
    if argv[0] == "--audit":
        rows = []
        for lid in lessons_all():
            e, w, s = check_one(lid)
            if s["run"] > MAX_THEORY_RUN or not s["gz"] or s["audio"] or s["traps"] > 6:
                rows.append((lid, s["run"], "—" if s["gz"] else "немає gz", s["audio"], s["traps"]))
        print(f"{'lesson':52} теорія-підряд  gz        слух.  пасток")
        for r in rows:
            print(f"{r[0]:52} {r[1]:>6}        {r[2]:9} {r[3]:>4}  {r[4]:>4}")
        print(f"\nлекцій з порушеннями: {len(rows)} із {len(lessons_all())}")
        return 0
    ids = lessons_changed() if argv[0] == "--changed" else argv
    bad = 0
    for lid in ids:
        e, w, _ = check_one(lid)
        for m in e:
            print(f"ERR  {lid}: {m}")
        for m in w:
            print(f"WARN {lid}: {m}")
        bad += bool(e)
    print(("✗ " if bad else "✓ ") + f"{len(ids)} лекц. перевірено, з помилками: {bad}")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
