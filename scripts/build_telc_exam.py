#!/usr/bin/env python3
"""
Збирає все для пробного telc B1·B2 з двох-трьох вхідних файлів (docs/TELC_PLAYBOOK.md).

  python3 scripts/build_telc_exam.py pl-telc-probny-08          # перевірка формату + генерація
  python3 scripts/build_telc_exam.py pl-telc-probny-08 --check  # лише перевірка

Вхід:  src/content/queue-published/{id}-mock.json   завдання, ключі, explain, транскрипти
       scripts/mock_audio/{id}.voices.json           голоси й паузи
       scripts/telc/{id}.oral.json                   усна частина, номер, обкладинка
Вихід: src/content/audio/{id}.json                   сценарій, з якого сайт сам озвучує mp3
       src/content/pages/{id}.md                     сторінка учня
       src/content/teacher-pages/{id}.md             ключ, усна, транскрипти
       src/content/i18n/pages/{id}.{ru,pl,en}.json   (копія з попереднього номера)
       content-queue/_manifest.json                  запис уроку
Мережі не потребує; кредитів ElevenLabs не витрачає.
"""
import datetime
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from gen_mock_audio import AFTER_LEKTOR, LINE_GAP, plan_task  # noqa: E402

MODEL = "eleven_v4"
EXPECTED = {"sl1": 4, "sl2": 10, "sl3": 6, "sl4": 3, "cz1": 4, "cz2": 5, "cz3": 6, "cz4": 3, "el1": 8, "el2": 10}
START = {"sl1": 1, "sl2": 5, "sl3": 15, "sl4": 21, "cz1": 24, "cz2": 28, "cz3": 33, "cz4": 39, "el1": 42, "el2": 50}
SITE = "https://werba-way.vercel.app/embed"


def path(*p):
    return os.path.join(ROOT, *p)


def read(*p):
    with open(path(*p), encoding="utf-8") as f:
        return json.load(f)


def write(rel, text):
    os.makedirs(os.path.dirname(path(rel)), exist_ok=True)
    with open(path(rel), "w", encoding="utf-8") as f:
        f.write(text)
    print("  →", rel)


def dump(obj):
    return json.dumps(obj, ensure_ascii=False, indent=2) + "\n"


def tasks_of(exam):
    return {t["id"]: t for s in exam["sections"] for t in s["tasks"]}


def entries(t):
    return t.get("gaps") if t["layout"] == "cloze" else t.get("items")


def validate(lid, exam):
    errs = []
    ts = tasks_of(exam)
    if exam.get("lesson_id") != lid:
        errs.append("lesson_id у JSON не збігається з id")
    if exam.get("scoring") != "telc" or exam.get("levels") != {"B1": 27, "B2": 43}:
        errs.append("scoring має бути telc, levels B1 27 / B2 43")
    for tid, n in EXPECTED.items():
        t = ts.get(tid)
        if not t:
            errs.append(f"немає завдання {tid}")
            continue
        es = entries(t)
        if len(es) != n:
            errs.append(f"{tid}: {len(es)} пунктів замість {n}")
        if tid != "el1" and tid != "el2" and t.get("start_n") != START[tid]:
            errs.append(f"{tid}: start_n має бути {START[tid]}")
        for e in es:
            if not e.get("explain"):
                errs.append(f"{tid}/{e.get('id')}: немає explain")
        if tid.startswith("sl"):
            a = t.get("audio") or {}
            if a.get("src") != f"/audio/{lid}/telc-sluchanie-{tid[2]}.mp3" or a.get("max_plays") != 1:
                errs.append(f"{tid}: audio.src / max_plays")
            if not t.get("transcript"):
                errs.append(f"{tid}: немає transcript")
    for tid, bank, extra in (("sl4", "right", 2), ("cz1", "right", 2), ("el1", "bank", 2)):
        t = ts.get(tid)
        if t:
            used = {e["answer"] for e in entries(t)} | ({t["example"]["answer"]} if tid == "sl4" else set())
            if len({b["key"] for b in t[bank]} - used) != extra:
                errs.append(f"{tid}: зайвих варіантів має бути рівно {extra}")
    if "cz2" in ts and [e["answer"] for e in ts["cz2"]["items"]].count("x") != 1:
        errs.append("cz2: рівно один пункт з відповіддю x")
    if len((ts.get("pi1") or {}).get("choices", [])) != 2:
        errs.append("pi1: два теми, A і B")
    return errs


def audio_script(lid, exam, voices):
    cast, files, used = voices["cast"], {}, {}
    for n in range(1, 5):
        t = tasks_of(exam)[f"sl{n}"]
        cfg = voices["tasks"][f"sl{n}"]
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
        files[f"{lid}/telc-sluchanie-{n}.mp3"] = {"lines": lines}
    return {"lesson_id": lid, "model": MODEL, "voices": used, "files": files}


def frontmatter(o, title, icon, extra=""):
    return (f"---\n{extra}title: {title}\nicon: {icon}\nlevel: B1\nnumber: {o['number']}\nmodule: pl-telc-probny\n"
            f"moduleTitle: Пробні іспити telc B1·B2\ncover: {o['cover']}\n---\n")


def callout(tone, icon, body):
    return (f'<aside class="lp-callout" data-tone="{tone}"><span class="lp-callout-icon" aria-hidden="true">{icon}</span>'
            f'<div class="lp-callout-body">\n\n{body}\n\n</div></aside>\n')


def oral_blocks(o):
    q = "\n".join(f"1. {x}" for x in o["photo_questions"])

    def topic(letter, key, tone, icon):
        t = o[key]
        pts = "\n".join(f"- {p}" for p in t["points"])
        return callout(tone, icon, f"<b>Temat {letter}: {t['title']}</b>\n\n{pts}")

    ops = "<br><br>".join(f"„{a}” — <b>{b}</b>" for a, b in o["discussion"]["opinions"])
    pa, pb = o["photo_a"], o["photo_b"]
    return "\n".join([
        callout("blue", "⏱️", "Egzamin ustny zdajesz w parze. Na prawdziwym egzaminie masz <b>20 minut</b> na przygotowanie, "
                "a rozmowa trwa ok. <b>16 minut</b>. Przygotuj się z tymi zadaniami — przećwiczymy je na lekcji."),
        f"### Część 1 · Rozmowa o zdjęciu: {o['photo_topic']}\n",
        f"<b>Zdjęcie A</b> — osoba A\n\n![{pa['alt']}. Fot. {pa['credit']}]({pa['url']})\n",
        f"<b>Zdjęcie B</b> — osoba B\n\n![{pb['alt']}. Fot. {pb['credit']}]({pb['url']})\n",
        q + "\n",
        "### Część 2 · Prezentacja\n",
        "Każda osoba wybiera jeden temat i mówi <b>ok. 2 minut</b>. Nie czytaj z kartki. Potem są jedno lub dwa pytania.\n",
        topic("A", "topic_a", "orange", "🎉"),
        topic("B", "topic_b", "green", "📚"),
        f"### Część 3 · Dyskusja: {o['discussion']['question']}\n",
        callout("gray", "💬", ops),
        "Przeczytajcie opinie. Powiedzcie, z którą się zgadzacie i dlaczego, podajcie przykłady z własnego życia. "
        "Spróbujcie dojść do wspólnego wniosku.\n",
    ])


def student_page(lid, exam, o):
    n = o["number"]
    intro = callout("yellow", "🎯", "<b>Egzamin próbny telc B1·B2</b> — cała część pisemna, jak na prawdziwym egzaminie: słuchanie, "
                    "czytanie, elementy językowe i e-mail. Nagrania do słuchania usłyszysz tylko raz — jak na egzaminie. "
                    "Zaloguj się na konto Werba Way — wynik zapisze się na Twoim koncie. Wynik testu zobaczysz od razu, "
                    "e-mail dostanie orientacyjną ocenę AI.")
    facts = ("- <b>Słuchanie</b> — 4 części, 23 zadania, każdy tekst tylko raz\n- <b>Czytanie</b> — 4 części, 18 zadań, 40 minut\n"
             "- <b>Elementy językowe</b> — 2 części, 18 zadań, 20 minut\n- <b>Wypowiedź pisemna</b> — e-mail, temat A lub B, 30 minut\n"
             "- Wynik testu (59 p.): <b>B1 od 27 p.</b>, <b>B2 od 43 p.</b>\n- Ciche miejsce, bez słownika i tłumacza\n")
    emb = lambda part, label: f'<embed source="{SITE}/{lid}/mock-exam?part={part}">\n\t{label}\n</embed>\n'
    parts = [intro + "\n" + facts, emb("start", "Zasady i start")]
    for head, part, label in (("🎧 Słuchanie", "sl", "Rozumienie ze słuchu"), ("📖 Czytanie", "cz", "Rozumienie tekstu czytanego"),
                              ("🧩 Elementy", "el", "Elementy językowe"), ("✍️ Pisanie", "pi", "Wypowiedź pisemna"),
                              ("🏁 Wynik", "wynik", "Podsumowanie i wynik")):
        parts.append(f"## {head}\n\n" + emb(part, label))
    parts.append("## 🗣️ Egzamin ustny\n\n" + oral_blocks(o))
    return frontmatter(o, f"{n:02d} · Egzamin próbny telc B1·B2 — {n}", "📝") + "\n" + "\n---\n\n".join(parts)


def teacher_page(lid, exam, o):
    n = o["number"]
    ts = tasks_of(exam)
    names = {"sl1": "Słuchanie 1", "sl2": "Słuchanie 2", "sl3": "Słuchanie 3", "sl4": "Słuchanie 4", "cz1": "Czytanie 1",
             "cz2": "Czytanie 2", "cz3": "Czytanie 3", "cz4": "Czytanie 4", "el1": "Elementy 1", "el2": "Elementy 2"}
    rows = ["| Część | Odpowiedzi |", "| --- | --- |"]
    for tid, name in names.items():
        ans = " · ".join(f"{START[tid] + i} {e['answer']}" for i, e in enumerate(entries(ts[tid])))
        rows.append(f"| {name} | {ans} |")
    traps = "\n".join(f"- {x}" for x in o.get("traps", []))
    writing = "\n".join(f"- <b>Temat {c['id']}</b> — {c['intro']}" for c in ts["pi1"]["choices"])
    examiner = "\n".join(f"- „{x}”" for x in o["examiner"])
    heads = {1: "wiadomości głosowe", 2: "dialogi", 3: "wywiad", 4: "opinie"}
    transcripts = []
    for k in range(1, 5):
        body = ts[f"sl{k}"]["transcript"]
        body = "<br><br>".join(
            "<br>".join(re.sub(r"^([^:]{1,40}):", r"<b>\1:</b>", line) for line in block.split("\n"))
            for block in body.split("\n\n"))
        transcripts.append(f"### Część {k} · {heads[k]}\n\n" + callout("yellow", "🎙️", body))
    out = [
        callout("red", "🔒", f'<b>Для викладача.</b> Ключ, письмо, усна частина й транскрипти. Спроби учнів: /teacher/exams. '
                f'Сторінка учня: <a href="/learn/{lid}">{n:02d} · Egzamin próbny telc B1·B2 — {n}</a>'),
        f"## 🔑 Ключ (59 p.)\n\n" + "\n".join(rows) + "\n\nПороги тесту: <b>B2 43–59</b>, <b>B1 27–42</b>, нижче 27 — B1 не складено.\n",
        ("## 🪤 Пастки\n\n" + traps + "\n") if traps else "",
        "## ✍️ E-mail\n\n" + writing + "\n\nОцінює AI (орієнтовно): Treść · Kompozycja · Poprawność · Słownictwo, по 0–5. "
        "15–20 = B2, 7–14 = B1, 0–6 = нижче B1. Не на тему → 0 за все.\n",
        "## 🗣️ Усна частина\n\n- Підготовка 20 хв, без словника. Розмова ≈ 16 хв.\n- Część 1: опис фото і досвід.\n"
        "- Część 2: презентація ≈ 2 хв (прочитана з аркуша = максимум A2) + 1–2 питання.\n"
        "- Część 3: дискусія; на індивідуальному уроці партнера грає викладач.\n\nДодаткові питання:\n\n" + examiner + "\n",
        "## 🎧 Транскрипти\n\nАудіо в іспиті озвучене на сайті; тексти — лише для перевірки.\n\n" + "\n".join(transcripts),
        "## 📌 Факти\n\nУсі тексти, люди, установи й ціни вигадані. Фото усної частини: "
        f"{o['photo_a']['credit']}; {o['photo_b']['credit']}.\n",
    ]
    fm = frontmatter(o, f"{n:02d} · Egzamin próbny telc B1·B2 — {n}", "🔑", extra=f"teacherOf: {lid}\n")
    return fm + "\n" + "\n".join(x for x in out if x)


def manifest(lid, o, overrides=None):
    rel = "content-queue/_manifest.json"
    with open(path(rel), encoding="utf-8") as f:
        raw = f.read()
    if f'"{lid}"' in raw:
        return
    n = o["number"]
    entry = {
        "lesson_id": lid, "module": "pl-telc-probny", "course_order": n, "level": "B1",
        "title": f"Egzamin próbny telc B1·B2 — {n}",
        "published_at": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "template": "mock-exam telc B1·B2",
        "embeds": {"mock_exam": f"{SITE}/{lid}/mock-exam"},
        "audio": {"status": f"generuje strona: src/content/audio/{lid}.json", "max_plays": 1},
        "status": "published", "published_by": "claude", "site_url": f"https://werbaway.com/learn/{lid}",
    }
    entry.update(overrides or {})
    data = json.loads(raw)
    data["lessons"].append(entry)
    # вставляємо текстом, щоб не переформатувати весь манифест
    start = raw.index('"lessons"')
    depth, i, in_str, esc = 0, raw.index("[", start), False, False
    while True:
        c = raw[i]
        if in_str:
            if esc:
                esc = False
            elif c == "\\":
                esc = True
            elif c == '"':
                in_str = False
        elif c == '"':
            in_str = True
        elif c == "[":
            depth += 1
        elif c == "]":
            depth -= 1
            if depth == 0:
                break
        i += 1
    block = "\n".join("    " + l for l in json.dumps(entry, ensure_ascii=False, indent=2).split("\n"))
    new = raw[:i].rstrip() + ",\n" + block + "\n  " + raw[i:]
    assert json.loads(new) == data
    write(rel, new)


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
    print(f"✓ формат telc 23+18+18; озвучення ≈ {sum(chars.values())} знаків (= кредитів ElevenLabs)")
    if "--check" in sys.argv:
        return
    o = read("scripts", "telc", f"{lid}.oral.json")
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
