#!/usr/bin/env python3
"""
Werba Way: structural + content self-check for a lesson package (v3.4 + changes of 2026-10-07).

Usage:
  python3 scripts/check_lesson.py <lesson_id> <content-queue dir>
Example:
  python3 scripts/check_lesson.py pl-b1-group-03-slang content-queue

Exit code 0 = no errors. Any ERROR line must be fixed (or reported to Claude in chat) before publishing.
Does NOT replace the visual check of the rendered exercises (see CURSOR_TASK).
"""
import json, re, sys, os, glob

lid = sys.argv[1]
root = sys.argv[2]
errors, warns = [], []


def err(m): errors.append(m)
def warn(m): warns.append(m)


def load(path):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        err(f"{path}: JSON nie parsuje się: {e}")
        return None


P = {
    "md": f"{root}/lectures/pending/{lid}.md",
    "slides": f"{root}/slides/pending/{lid}-slides.json",
    "vocab": f"{root}/exercises/pending/{lid}-vocab.json",
    "comm": f"{root}/exercises/pending/{lid}-comm-tasks.json",
    "grammar": f"{root}/exercises/pending/{lid}-grammar.json",
    "exam": f"{root}/exercises/pending/{lid}-exam.json",
    "hw": f"{root}/exercises/pending/{lid}-hw.json",
    "teacher": f"{root}/teacher/pending/{lid}-teacher.md",
}
for k, p in P.items():
    if not os.path.exists(p):
        err(f"brak pliku: {p}")
if errors:
    print("\n".join(errors)); sys.exit(1)

md = open(P["md"], encoding="utf-8").read()
fm = re.match(r"---\n(.*?)\n---", md, re.S).group(1)
gp_line = re.search(r"grammar_points:\s*\[(.*?)\]", fm).group(1)
GRAMMAR_POINTS = {x.strip() for x in gp_line.split(",")}

slides = load(P["slides"]); vocab = load(P["vocab"]); comm = load(P["comm"])
grammar = load(P["grammar"]); exam = load(P["exam"]); hw = load(P["hw"])

# ---------------------------------------------------------------- generic: no ASCII quotes in strings, no empty strings
def walk(o, path, cb):
    if isinstance(o, dict):
        for k, v in o.items(): walk(v, f"{path}.{k}", cb)
    elif isinstance(o, list):
        for i, v in enumerate(o): walk(v, f"{path}[{i}]", cb)
    elif isinstance(o, str):
        cb(path, o)


def strcheck(name, data):
    def cb(path, s):
        if '"' in s: err(f"{name}{path}: prosty cudzysłów \" w wartości (użyj „ ”)")
        if s.strip() == "" and not path.endswith("columns[0]"):
            err(f"{name}{path}: pusty tekst")
    walk(data, "", cb)


for n, d in (("slides", slides), ("vocab", vocab), ("comm", comm), ("grammar", grammar), ("exam", exam), ("hw", hw)):
    strcheck(n, d)

# ---------------------------------------------------------------- ids unique across lesson
ids = []
def collect_ids(d, name):
    for b in d.get("blocks", []):
        for it in b.get("items", []):
            ids.append((name, it["id"]))
for d, n in ((grammar, "grammar"), (exam, "exam"), (hw, "hw")): collect_ids(d, n)
for it in comm["items"]: ids.append(("comm", it["id"]))
for it in vocab["items"]: ids.append(("vocab", it["id"]))
seen = {}
for n, i in ids:
    if i in seen: err(f"zdublowane id: {i} ({seen[i]} i {n})")
    seen[i] = n
block_ids = [b["block_id"] for d in (grammar, exam, hw) for b in d["blocks"]]
if len(block_ids) != len(set(block_ids)):
    err("zdublowane block_id")

# ---------------------------------------------------------------- exercises
def norm(s): return re.sub(r"\s+", " ", s.strip().lower())

KNOWN_NUM = set("""dwóch trzech czterech pięciu sześciu siedmiu ośmiu dziewięciu dziesięciu jedenastu dwunastu
dwóm trzem czterem dwoma trzema czterema pięcioma sześcioma siedmioma ośmioma dziewięcioma dziesięcioma
dwoje troje czworo pięcioro sześcioro siedmioro ośmioro dziewięcioro dziesięcioro
dwojga trojga czworga pięciorga dwojgu trojgu czworgu pięciorgu dwojgiem trojgiem czworgiem pięciorgiem
dwie dwa trzy cztery pięć sześć siedem osiem dziewięć dziesięć jedenaście dwanaście""".split())


def check_item(b, it, where, need_gp=True):
    t = b["exercise_type"]
    if not need_gp and "grammar_point" not in it:
        pass
    elif "grammar_point" not in it:
        err(f"{where}: brak grammar_point")
    elif it["grammar_point"] not in GRAMMAR_POINTS:
        err(f"{where}: grammar_point '{it['grammar_point']}' nie ma we frontmatter")
    if t == "fill-in-blank":
        if it["text"].count("___") != 1: err(f"{where}: powinna być dokładnie jedna luka ___")
        a = it["answer"]
        if "options" in it:
            o = it["options"]
            if not (2 <= len(o) <= 4): err(f"{where}: options powinno mieć 2–4 pozycje")
            if len(set(map(norm, o))) != len(o): err(f"{where}: zdublowane options")
            if a not in o: err(f"{where}: answer '{a}' nie ma w options {o}")
            for x in o:
                if x.lower() not in KNOWN_NUM and not x.isalpha(): warn(f"{where}: podejrzana opcja '{x}'")
        if a.lower() not in KNOWN_NUM and "options" not in it: warn(f"{where}: odpowiedź '{a}' spoza listy znanych form (literówka?)")
        for acc in it.get("accept", []):
            if norm(acc) == norm(a): err(f"{where}: accept powtarza answer")
    elif t == "sentence-building":
        if not it.get("prompt") or not it.get("answer"): err(f"{where}: brak prompt/answer")
        if not it["answer"].strip().endswith((".", "?", "!")): warn(f"{where}: answer bez znaku końcowego")
    elif t == "true-false":
        if not isinstance(it["answer"], bool): err(f"{where}: answer musi być boolean")
        if not it.get("explanation"): err(f"{where}: brak explanation")
    elif t == "multiple-choice":
        o = it["options"]
        if len(o) != 3: err(f"{where}: powinny być 3 opcje")
        if len(set(map(norm, o))) != len(o): err(f"{where}: zdublowane options")
        if it["answer"] not in o: err(f"{where}: answer nie ma w options")
        if not it.get("explanation"): err(f"{where}: brak explanation")
    elif t == "matching":
        pass
    elif t == "drag-and-drop":
        if it["text"].count("___") != 1: err(f"{where}: powinna być dokładnie jedna luka ___")
        if it["answer"] not in b.get("bank", []): err(f"{where}: answer nie ma w bank")


def check_block(b, fname):
    need_gp = fname != "exam"
    t = b["exercise_type"]; its = b["items"]
    where0 = f"{fname}:{b['block_id']}"
    if not its: err(f"{where0}: pusty blok")
    texts = [it.get("text") or it.get("prompt") or it.get("statement") or it.get("question") or it.get("left") for it in its]
    if len(set(texts)) != len(texts): err(f"{where0}: zdublowane pytania w bloku")
    if t == "matching":
        L = [it["left"] for it in its]; R = [it["right"] for it in its]
        if len(set(L)) != len(L) or len(set(R)) != len(R): err(f"{where0}: zdublowane strony w matching")
    if t == "drag-and-drop":
        bank = b.get("bank", [])
        if len(bank) != len(set(bank)): err(f"{where0}: zdublowane słowa w bank")
        answers = [it["answer"] for it in its]
        if len(set(answers)) != len(answers): warn(f"{where0}: powtarzające się answers w drag-and-drop")
        extra = [w for w in bank if w not in answers]
        if not (2 <= len(extra) <= 3): err(f"{where0}: powinny być 2–3 słowa-pułapki w bank, jest {len(extra)}")
    for it in its:
        check_item(b, it, f"{where0}:{it['id']}", need_gp)


for d, n in ((grammar, "grammar"), (exam, "exam"), (hw, "hw")):
    for b in d["blocks"]:
        check_block(b, n)

# id prefixes
for n, i in ids:
    pref = {"grammar": "g", "exam": "e", "hw": "h", "comm": "c", "vocab": "v"}[n]
    if not i.startswith(pref): err(f"id {i} w {n} bez prefiksu '{pref}'")

# ---------------------------------------------------------------- slides
S = slides["slides"]
sid = {s["id"]: s for s in S}
theory = [s for s in S if s["section"] == "teoria" and s["kind"] != "title"]
wy = [s for s in S if s["section"] == "wyjatki"]
pu = [s for s in S if s["section"] == "pulapki"]
if not (10 <= len(theory) <= 14): err(f"slajdy teorii: {len(theory)} (B1: 10–14)")
if not (1 <= len(wy) <= 2): err(f"slajdy wyjątków: {len(wy)}")
if not (1 <= len(pu) <= 2): err(f"slajdy pułapek: {len(pu)}")
order = {"teoria": 0, "wyjatki": 1, "pulapki": 2}
if [order[s["section"]] for s in S] != sorted(order[s["section"]] for s in S): err("kolejność sekcji: teoria → wyjatki → pulapki")
ntraps = sum(len(s["items"]) for s in pu)
if not (5 <= ntraps <= 6): err(f"pułapek razem: {ntraps} (ma być 5–6)")
CYR = re.compile("[А-Яа-яІіЇїЄєҐґ]")
FORBID = re.compile(r"wyjątek|oprócz|z wyjątkiem", re.I)
for s in S:
    w = f"slides:{s['id']}"
    if not CYR.search(s.get("teacher_note", "")): err(f"{w}: teacher_note musi być po ukraińsku")
    blob = json.dumps(s, ensure_ascii=False)
    hl = len(re.findall(r"\[\[.*?\]\]", blob))
    if hl > 6: err(f"{w}: {hl} wyróżnień [[...]] (max 6)")
    if "___" in blob or "…" in blob.replace("…", "…") and re.search(r'"…"', blob): err(f"{w}: puste miejsce (___ lub …)")
    if s["section"] == "teoria" and FORBID.search(blob): err(f"{w}: w teorii nie wolno używać wyjątek/oprócz/z wyjątkiem")
    if s["section"] == "wyjatki":
        if s.get("refers_to") not in sid or sid[s["refers_to"]]["section"] != "teoria": err(f"{w}: zły refers_to")
    if s["kind"] == "table":
        cols = len(s["columns"])
        if cols > 6 or len(s["rows"]) > 6: err(f"{w}: tabela większa niż 6×6")
        for r in s["rows"]:
            if len(r) != cols: err(f"{w}: wiersz ma {len(r)} komórek, kolumn {cols}")
            for c in r:
                if len(re.sub(r"\[\[|\]\]", "", c).split()) > 4: err(f"{w}: komórka dłuższa niż 4 słowa: {c}")
                if c.strip() in ("", "?", "___"): err(f"{w}: pusta komórka")
    if s["kind"] == "traps":
        if len(s["items"]) > 3: err(f"{w}: >3 pułapki na slajdzie")
        for it in s["items"]:
            if not CYR.search(it["uk"]): err(f"{w}: pułapka bez ukraińskiej formy")
            if it["why"].lower().startswith("dlaczego"): err(f"{w}: why nie może zaczynać się od 'Dlaczego'")
    if s["kind"] == "examples":
        for it in s["items"]:
            if len(re.sub(r"\[\[|\]\]", "", it["pl"]).split()) > 12: err(f"{w}: przykład >12 słów")

# covers_slides
covered = set()
for b in grammar["blocks"]:
    for x in b.get("covers_slides", []):
        if x not in sid: err(f"grammar:{b['block_id']}: covers_slides wskazuje nieistniejący {x}")
        covered.add(x)
for s in S:
    if s["kind"] != "title" and s["id"] not in covered: err(f"slajd {s['id']} nie jest pokryty przez żaden blok (covers_slides)")

# ---------------------------------------------------------------- vocab / comm
vi = vocab["items"]
if not (35 <= len(vi) <= 40): err(f"słownik: {len(vi)} słów (B1: 35–40)")
if not (4 <= len(vocab["groups"]) <= 6): err("słownik: grup ma być 4–6")
for g in vocab["comm_groups"]:
    if g not in vocab["groups"]: err(f"comm_group '{g}' nie ma w groups")
for it in vi:
    if it["group"] not in vocab["groups"]: err(f"vocab {it['id']}: nieznana grupa")
terms = {it["term"]: it["group"] for it in vi}
cg_map = {"c1": "Wolny czas i miasto", "c2": "Pieniądze i ceny", "c3": "Szkoła i praca"}
for t in comm["items"]:
    blob = json.dumps(t, ensure_ascii=False).lower()
    hits = [w for w, g in terms.items() if g == cg_map[t["id"]] and w.lower() in blob]
    if len(hits) < 4: err(f"comm {t['id']}: tylko {len(hits)} słów z grupy '{cg_map[t['id']]}': {hits}")
    if not (3 <= len(t["back_checklist"]) <= 5): err(f"comm {t['id']}: checklista ma 3–5 punktów")
c1 = comm["items"][0]
if not (10 <= len(c1["model_dialogue"]) <= 14): err(f"c1.model_dialogue: {len(c1['model_dialogue'])} replik (10–14)")

# ---------------------------------------------------------------- reading text
m = re.search(r"### .*?\n(.*?)\n## 2\.", md, re.S)
text = re.sub(r"\[(AUDIO|IMAGE)[^\]]*\]", "", m.group(1))
nw = len([w for w in text.split() if w != "–"])
if not (400 <= nw <= 500): err(f"tekst do czytania: {nw} słów (B1: 400–500)")

# ---------------------------------------------------------------- md markers
for mk in re.finditer(r"\[(EXERCISE|SLIDES)([^\]]*)\]", md):
    kv = dict(re.findall(r'(\w+)="([^"]*)"', mk.group(2)))
    f = kv.get("file")
    path = glob.glob(f"{root}/*/pending/{f}")
    if not path: err(f"marker {mk.group(0)}: brak pliku {f}")
    if "blocks" in kv:
        a = kv["blocks"].split("-");
        d = json.load(open(path[0], encoding="utf-8")) if path else None
        have = [b["block_id"] for b in d.get("blocks", [])] if d else []
        for x in a:
            if x not in have: err(f"marker {mk.group(0)}: brak bloku {x} w {f}")
for mk in re.finditer(r"\[IMAGE([^\]]*)\]", md):
    if 'source="' not in mk.group(1): err("[IMAGE] bez source")

# ---------------------------------------------------------------- homework vs lesson
def sentences(s):
    return {norm(x) for x in re.split(r"(?<=[.!?])\s+", s) if len(x.split()) > 2}
lesson_blob = md.split("## 9. Praca domowa")[0]
lesson_blob += " " + json.dumps(slides, ensure_ascii=False) + json.dumps(grammar, ensure_ascii=False) + json.dumps(vocab, ensure_ascii=False) + json.dumps(comm, ensure_ascii=False) + json.dumps(exam, ensure_ascii=False)
L = norm(re.sub(r"\[\[|\]\]", "", lesson_blob))
hw_sents = []
for b in hw["blocks"]:
    for it in b["items"]:
        for k in ("text", "prompt", "answer", "statement"):
            if k in it: hw_sents.append(it[k])
for s in hw_sents:
    n = norm(re.sub(r"\[\[|\]\]", "", s)).rstrip(".?!")
    if len(n.split()) > 3 and n in L: err(f"hw: zdanie powtarza się w lekcji: {s}")
names = set(re.findall(r"(?<![.!?–]\s)(?<!^)\b([A-ZŁŚŻŹĆ][a-ząćęłńóśźż]{2,})\b", re.sub(r"\n", " ", md.split("## 9. Praca domowa")[0])))
hw_blob = json.dumps(hw, ensure_ascii=False)
for nme in sorted(names):
    if re.search(rf"\b{nme}\b", hw_blob): warn(f"hw zawiera słowo z wielkiej litery użyte w lekcji: {nme} (sprawdź, czy to nie imię lub nazwa)")

# ---------------------------------------------------------------- teacher file
t = open(P["teacher"], encoding="utf-8").read()
if not CYR.search(t): err("teacher.md ma być po ukraińsku")
tables = re.findall(r"\|\s*(\d+)\s*(?:хв)?\s*\|", t)

print(f"Pliki: {len(P)} | slajdów: {len(S)} (teoria {len(theory)}, wyjątki {len(wy)}, pułapki {len(pu)}) | bloków grammar: {len(grammar['blocks'])} | słów: {len(vi)} | tekst: {nw} słów")
for w in warns: print("WARN ", w)
for e in errors: print("ERROR", e)
print(f"\n{len(errors)} błędów, {len(warns)} ostrzeżeń")
sys.exit(1 if errors else 0)
