#!/usr/bin/env python3
"""
Збирає все для пробного державного B1 (docs/B1_PLAYBOOK.md).

  python3 scripts/build_b1_exam.py pl-b1-probny-09          # перевірка формату + генерація
  python3 scripts/build_b1_exam.py pl-b1-probny-09 --check  # лише перевірка

Вхід:  src/content/queue-published/{id}-mock.json   завдання, ключі, explain, транскрипти
       scripts/mock_audio/{id}.voices.json           голоси, теги емоцій, паузи
       scripts/b1/{id}.oral.json                     усна частина (3 zestawy), ролі, номер, пастки
Вихід: src/content/audio/{id}.json                   сценарій, з якого сайт сам озвучує 5 mp3
       src/content/pages/{id}.md                     сторінка учня
       src/content/teacher-pages/{id}.md             ключ, письмо, ролі, транскрипти
       src/content/i18n/pages/{id}.{ru,pl,en}.json   (копія з попереднього номера)
       content-queue/_manifest.json                  запис уроку
Мережі не потребує; кредитів ElevenLabs не витрачає.
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from build_telc_exam import SITE, callout, dump, entries, path, read, tasks_of, write  # noqa: E402
from build_telc_exam import manifest as _manifest  # noqa: E402
from gen_mock_audio import AFTER_LEKTOR, LINE_GAP, plan_task  # noqa: E402

MODEL = "eleven_v4"
# id: (кількість пунктів, бали за пункт)
EXPECTED = {"rs1": (14, .5), "rs2": (7, 1), "rs3": (5, 1), "rs4": (6, 1), "rs5": (10, .5),
            "rt1": (5, 1), "rt2": (7, 1), "rt3": (7, 1), "rt4": (7, 1), "rt5": (8, .5),
            "pg1": (10, .5), "pg2": (5, .5), "pg3": (5, .5), "pg4": (10, .5), "pg5": (5, .5),
            "pg6": (5, 1), "pg7": (10, .5), "pg8": (5, .5)}
PLAYS = {1: 1, 2: 1, 3: 2, 4: 2, 5: 1}
NAMES = {"rs": "Słuchanie", "rt": "Czytanie", "pg": "Gramatyka"}


def validate(lid, exam):
    errs, ts = [], tasks_of(exam)
    if exam.get("lesson_id") != lid:
        errs.append("lesson_id у JSON не збігається з id")
    if exam.get("pass_ratio") != 0.5:
        errs.append("pass_ratio має бути 0.5")
    for sec in ("rs", "rt", "pg"):
        total = sum(len(entries(ts[t])) * ts[t]["points_per_item"] for t in EXPECTED if t.startswith(sec) and t in ts)
        if total != 30:
            errs.append(f"{sec}: {total} p. замість 30")
    for tid, (n, pts) in EXPECTED.items():
        t = ts.get(tid)
        if not t:
            errs.append(f"немає завдання {tid}")
            continue
        es = entries(t) or []
        if len(es) != n or t.get("points_per_item") != pts:
            errs.append(f"{tid}: {len(es)} пунктів × {t.get('points_per_item')} замість {n} × {pts}")
        if not t.get("example"):
            errs.append(f"{tid}: немає example")
        for e in es:
            if not e.get("explain"):
                errs.append(f"{tid}/{e.get('id')}: немає explain")
        if tid.startswith("rs"):
            k = int(tid[2])
            a = t.get("audio") or {}
            if a.get("src") != f"/audio/{lid}/b1-sluchanie-{k}.mp3" or a.get("max_plays") != PLAYS[k]:
                errs.append(f"{tid}: audio.src / max_plays має бути {PLAYS[k]}")
            if not t.get("transcript"):
                errs.append(f"{tid}: немає transcript")
            elif re.search(r"\d", t["transcript"]):
                errs.append(f"{tid}: цифри в транскрипті — пиши словами (так їх читає голос)")
    for tid, bank, extra in (("rs5", "right", 2), ("rt3", "bank", 2), ("rt4", "right", 2)):
        t = ts.get(tid)
        if t:
            used = {e["answer"] for e in entries(t)} | {t["example"]["answer"]}
            if len({b["key"] for b in t[bank]} - used) != extra - 1:
                errs.append(f"{tid}: має лишитися рівно один зайвий варіант")
    for tid in ("pg2", "pg8"):
        t = ts.get(tid)
        if t:
            used = {e["answer"] for e in entries(t)} | {t["example"]["answer"]}
            if len(set(t["bank_words"]) - used) != 1 or not used <= set(t["bank_words"]):
                errs.append(f"{tid}: bank_words = відповіді + приклад + рівно одне зайве слово")
    pi = ts.get("pi1") or {}
    if len(pi.get("choices", [])) != 3 or any(len(c["parts"]) != 2 for c in pi.get("choices", [])):
        errs.append("pi1: три zestawy по два тексти")
    return errs


def audio_script(lid, exam, voices):
    cast, files, used = voices["cast"], {}, {}
    for n in range(1, 6):
        t = tasks_of(exam)[f"rs{n}"]
        cfg = voices["tasks"][f"rs{n}"]
        lines = []
        for bi, block in enumerate(plan_task(t, cfg, cast)):
            prev = None
            for li, (speaker, code, _vid, text) in enumerate(block):
                line = {"who": code, "text": text}
                if lines:
                    if li == 0:
                        line["gap"] = cfg.get("gaps", {}).get(str(bi), cfg.get("block_gap", 1.5))
                    else:
                        line["gap"] = AFTER_LEKTOR if prev == "Lektor" else LINE_GAP
                prev = speaker
                used[code] = cast[code]
                lines.append(line)
        files[f"{lid}/b1-sluchanie-{n}.mp3"] = {"lines": lines}
    return {"lesson_id": lid, "model": MODEL, "voices": used, "files": files}


def frontmatter(o, title, icon, extra=""):
    return (f"---\n{extra}title: {title}\nicon: {icon}\nlevel: B1\nnumber: {o['number']}\nmodule: pl-b1-cert\n"
            f"moduleTitle: Державний іспит B1\ncover: {o['cover']}\n---\n")


ROMAN = ["I", "II", "III"]


def student_page(lid, exam, o):
    n = o["number"]
    intro = callout("yellow", "🎯", "<b>Egzamin próbny B1</b> — pełna część pisemna egzaminu państwowego: słuchanie, czytanie, "
                    "gramatyka i pisanie. Zaloguj się na konto Werba Way — wynik zapisze się na Twoim koncie. Wynik testu "
                    "i poprawne odpowiedzi zobaczysz od razu, teksty dostaną orientacyjną ocenę AI.")
    facts = ("- <b>Rozumienie ze słuchu</b> — 5 zadań, 30 p.\n- <b>Rozumienie tekstów pisanych</b> — 5 zadań, 30 p., 45 minut\n"
             "- <b>Poprawność gramatyczna</b> — 8 zadań, 30 p., 45 minut\n- <b>Pisanie</b> — 2 teksty z jednego zestawu, 75 minut\n"
             "- Próg: co najmniej <b>50% w każdej części</b>\n- Słuchawki, ciche miejsce, bez słownika i tłumacza\n")
    emb = lambda part, label: f'<embed source="{SITE}/{lid}/mock-exam?part={part}">\n\t{label}\n</embed>\n'
    parts = [intro + "\n" + facts, emb("start", "Zasady i start")]
    for head, part, label in (("🎧 Słuchanie", "rs", "Rozumienie ze słuchu"), ("📖 Czytanie", "rt", "Rozumienie tekstów pisanych"),
                              ("🧩 Gramatyka", "pg", "Poprawność gramatyczna"), ("✍️ Pisanie", "pi", "Wypowiedź pisemna"),
                              ("🏁 Wynik", "wynik", "Podsumowanie i wynik")):
        parts.append(f"## {head}\n\n" + emb(part, label))
    oral = [callout("blue", "⏱️", "Egzamin ustny zdajesz sam/sama z egzaminatorem. Losujesz jeden zestaw. Masz chwilę na "
                    "przygotowanie, potem mówisz ok. <b>15 minut</b>: opis zdjęcia, monolog i dialog.")]
    for i, s in enumerate(o["sets"]):
        p = s["photo"]
        oral.append(f"### Zestaw {ROMAN[i]}\n\n![{p['alt']}. Fot. {p['credit']}]({p['url']})\n\n"
                    f"1. <b>Zdjęcie.</b> {s['photo_q']}\n1. <b>Monolog.</b> {s['monolog']}\n1. <b>Dialog.</b> {s['dialog']}\n")
    parts.append("## 🗣️ Egzamin ustny\n\n" + "\n".join(oral))
    return frontmatter(o, f"{n:02d} · Egzamin próbny B1 — {n}", "📝") + "\n" + "\n---\n\n".join(parts)


def answer_row(t):
    es = entries(t)
    if t["layout"] == "transform":
        return " · ".join(e["model"] for e in es)
    out = " · ".join(f"{i} {e.get('answer') or ' / '.join(e['accept'])}" for i, e in enumerate(es, 1))
    ex = t["example"].get("answer")
    extra = ""
    if t["layout"] == "cloze" and t.get("bank_words"):
        extra = ", zbędne: " + ", ".join(sorted(set(t["bank_words"]) - {e["answer"] for e in es} - {ex}))
    elif t.get("bank") or (t["layout"] == "matching" and not t.get("reuse_keys")):
        keys = {b["key"] for b in (t.get("bank") or t["right"])}
        extra = ", zbędny: " + ", ".join(sorted(keys - {e["answer"] for e in es} - {ex}))
    return out + (f" (przykład: {ex}{extra})" if ex else "")


def teacher_page(lid, exam, o):
    n, ts = o["number"], tasks_of(exam)
    rows = ["| Zadanie | Odpowiedzi |", "| --- | --- |"]
    for tid, (_, pts) in EXPECTED.items():
        mark = " (0,5 p.)" if pts == .5 else (" (1 p.)" if tid == "pg6" else "")
        rows.append(f"| {NAMES[tid[:2]]} {tid[2]}{mark} | {answer_row(ts[tid])} |")
    traps = "\n".join(f"- {x}" for x in o.get("traps", []))
    roles = "\n".join(f"- <b>Zestaw {ROMAN[i]}, dialog</b>: ви — {s['role']}" for i, s in enumerate(o["sets"]))
    heads = {1: "krótkie nagrania", 2: "dialogi", 3: "wywiad", 4: "opinie", 5: "wypowiedzi do obrazków"}
    transcripts = []
    for k in range(1, 6):
        body = "<br><br>".join(
            "<br>".join(re.sub(r"^([^:]{1,40}):", r"<b>\1:</b>", line) for line in block.split("\n"))
            for block in ts[f"rs{k}"]["transcript"].split("\n\n"))
        transcripts.append(f"### Zadanie {k} · {heads[k]}\n\n" + callout("yellow", "🎙️", body))
    credits = "; ".join(s["photo"]["credit"] for s in o["sets"])
    out = [
        callout("red", "🔒", f'<b>Для викладача.</b> Ключ, письмо, ролі для усної частини й транскрипти. Спроби учнів: '
                f'/teacher/exams. Сторінка учня: <a href="/learn/{lid}">{n:02d} · Egzamin próbny B1 — {n}</a>'),
        "## 🔑 Ключ (90 p.)\n\n" + "\n".join(rows) + "\n\nПрохідний поріг — 50% у кожній частині (15 з 30). "
        "Gramatyka 6: система приймає кілька варіантів; якщо відповідь не збіглася зі списком — «do sprawdzenia» і 0 p., "
        "перевірте вручну.\n",
        ("## 🪤 Пастки\n\n" + traps + "\n") if traps else "",
        "## ✍️ Письмо\n\n" + o["writing_notes"] + "\n\nОцінює AI (орієнтовно, `docs/MOCK_EXAM_SPEC.md`): короткий текст 10 p., "
        "довгий 20 p.; довжина ±10% рахується кодом. Не на тему → 0.\n",
        "## 🗣️ Усна частина — ваші ролі\n\n" + roles + "\n- Після монологу — 1–2 дод. питання. Оцінюйте: виконання "
        "завдання, вільність, лексика, граматика, вимова.\n",
        "## 🎧 Транскрипти\n\nЗавдання 1, 2, 5 учень вмикає один раз (у 2 і 5 повтор вшитий у запис), 3 і 4 — двічі. "
        "Аудіо озвучене на сайті (ElevenLabs), голоси — `scripts/mock_audio/" + lid + ".voices.json`.\n\n" + "\n".join(transcripts),
        f"## 📌 Факти\n\nУсі тексти, люди, установи й ціни вигадані. Фото усної частини: {credits}.\n",
    ]
    fm = frontmatter(o, f"Egzamin próbny B1 — {n}", "🔑", extra=f"teacherOf: {lid}\n")
    return fm + "\n" + "\n".join(x for x in out if x)


def manifest(lid, o):
    n = o["number"]
    _manifest(lid, o, {"module": "pl-b1-cert", "title": f"Egzamin próbny B1 — {n}", "template": "mock-exam B1 państwowy",
                       "audio": {"status": f"generuje strona: src/content/audio/{lid}.json", "max_plays": "1/1/2/2/1"}})


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if len(args) != 1:
        sys.exit(__doc__)
    lid = args[0]
    exam = read("src", "content", "queue-published", f"{lid}-mock.json")
    errs = validate(lid, exam)
    if errs:
        sys.exit("\n".join("ERR " + e for e in errs))
    voices = read("scripts", "mock_audio", f"{lid}.voices.json")
    script = audio_script(lid, exam, voices)
    chars = {k: sum(len(l["text"]) for l in v["lines"]) for k, v in script["files"].items()}
    if max(chars.values()) > 8000:
        sys.exit("ERR аудіофайл понад 8000 знаків (ліміт сайту)")
    print(f"✓ формат державного B1 30+30+30; озвучення ≈ {sum(chars.values())} знаків")
    if "--check" in sys.argv:
        return
    o = read("scripts", "b1", f"{lid}.oral.json")
    write(f"src/content/audio/{lid}.json", dump(script))
    write(f"src/content/pages/{lid}.md", student_page(lid, exam, o))
    write(f"src/content/teacher-pages/{lid}.md", teacher_page(lid, exam, o))
    prev = f"{lid.rsplit('-', 1)[0]}-{o['number'] - 1:02d}"
    for loc in ("ru", "pl", "en"):
        src = path("src", "content", "i18n", "pages", f"{prev}.{loc}.json")
        if os.path.exists(src):
            with open(src, encoding="utf-8") as f:
                write(f"src/content/i18n/pages/{lid}.{loc}.json", f.read())
    manifest(lid, o)


if __name__ == "__main__":
    main()
