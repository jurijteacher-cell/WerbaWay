"""Спільні функції для validate_lesson.py і seed_lesson.py (Werba Way)."""
import json
import re
from pathlib import Path

import yaml

FILE_PREFIX = {
    "vocab": "v", "pictures": "p", "comm-tasks": "c", "grammar": "g",
    "hw": "h", "exam": "e", "test": "t",
}
EXTRA_TAGS = {"kalki-uk", "slownictwo"}


def load_curriculum(path):
    """Повертає dict з grammar_points, can_do, modules, lessons з усіх ```yaml блоків файлу."""
    text = Path(path).read_text(encoding="utf-8")
    data = {}
    for block in re.findall(r"```yaml\n(.*?)```", text, re.S):
        loaded = yaml.safe_load(block)
        if isinstance(loaded, dict) and ("grammar_points" in loaded or "can_do" in loaded
                                         or "modules" in loaded or "lessons" in loaded):
            data.update(loaded)
    return data


def split_frontmatter(md_text):
    m = re.match(r"^---\n(.*?)\n---\n(.*)$", md_text, re.S)
    if not m:
        return {}, md_text
    return yaml.safe_load(m.group(1)) or {}, m.group(2)


def find_lesson_files(folder):
    """Знаходить головний .md, teacher.md і JSON-файли уроку в папці."""
    folder = Path(folder)
    mds = [p for p in folder.glob("*.md") if not p.name.endswith("-teacher.md")]
    if len(mds) != 1:
        raise SystemExit(f"очікувався рівно 1 файл уроку .md у {folder}, знайдено {len(mds)}")
    md = mds[0]
    lesson_id = md.stem
    files = {"md": md, "teacher": folder / f"{lesson_id}-teacher.md", "json": {}}
    for kind in FILE_PREFIX:
        p = folder / f"{lesson_id}-{kind}.json"
        if p.exists():
            files["json"][kind] = p
    return lesson_id, files


def iter_items(kind, data):
    """Повертає (block, item) для файлу будь-якого типу; block = None для файлів без blocks."""
    if "blocks" in data:
        for b in data["blocks"]:
            for it in b.get("items", []):
                yield b, it
    else:
        for it in data.get("items", []):
            yield None, it


def stem(word):
    w = word.lower()
    s = re.sub(r"[aeiouyąęó]+$", "", w)
    return s if len(s) >= 3 else w


def mentions(core_word, text_lower):
    """Грубий пошук слова з урахуванням відмінювання: основа кожного слова фрази на початку токена."""
    parts = core_word.lower().split()
    pattern = r"\b" + r"\s+".join(re.escape(stem(p)) + r"\w*" for p in parts)
    return re.search(pattern, text_lower) is not None


def all_strings(obj):
    if isinstance(obj, str):
        yield obj
    elif isinstance(obj, dict):
        for v in obj.values():
            yield from all_strings(v)
    elif isinstance(obj, list):
        for v in obj:
            yield from all_strings(v)


def load_json(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


META_KEYS = {"instruction", "instruction_uk", "title", "alt", "image_keywords", "credit", "note",
             "label", "lesson_id", "exercise_type", "grammar_point", "voice", "speaker", "role",
             "source", "audio_id", "block_id", "id", "orientation", "part_of_speech", "group", "mode"}


def content_strings(obj):
    """Лише змістові рядки: без інструкцій, заголовків, метаданих."""
    if isinstance(obj, str):
        yield obj
    elif isinstance(obj, dict):
        for k, v in obj.items():
            if k not in META_KEYS:
                yield from content_strings(v)
    elif isinstance(obj, list):
        for v in obj:
            yield from content_strings(v)
