#!/usr/bin/env python3
"""Перевірка grammar_point у файлах вправ Werba Way.

Кожен `grammar_point` має бути або канонічним тегом, або зареєстрованим
синонімом із docs/grammar-registry.json. Тег поза списком — помилка публікації.

Використання:
    python3 scripts/check_tags.py                 # увесь каталог
    python3 scripts/check_tags.py --changed       # лише змінені файли (CI на PR)
    python3 scripts/check_tags.py --stats         # скільки уроків має кожен тег

Код виходу: 0 — усе чисто, 1 — є невідомі теги.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONTENT_DIR = os.path.join(ROOT, "src", "content", "queue-published")
REGISTRY = os.path.join(ROOT, "docs", "grammar-registry.json")
SUFFIX_RE = re.compile(
    r"-(vocab|grammar|hw|comm-tasks|exam|slides|test|listening|mock-exam|pictures|notes|grammar-board)\.json$"
)


def load_registry() -> tuple[set[str], dict[str, str], set[str]]:
    with open(REGISTRY, encoding="utf-8") as fh:
        reg = json.load(fh)
    return set(reg["points"]), reg["aliases"], set(reg["service"])


def walk(node, found: set[str]) -> None:
    if isinstance(node, dict):
        for key, value in node.items():
            if key == "grammar_point" and isinstance(value, str):
                found.add(value)
            else:
                walk(value, found)
    elif isinstance(node, list):
        for value in node:
            walk(value, found)


def lesson_id(filename: str) -> str:
    return SUFFIX_RE.sub("", filename)


def changed_files() -> list[str]:
    base = os.environ.get("GITHUB_BASE_REF", "main")
    try:
        out = subprocess.run(
            ["git", "diff", "--name-only", f"origin/{base}...HEAD"],
            cwd=ROOT, capture_output=True, text=True, check=True,
        ).stdout
    except subprocess.CalledProcessError:
        out = subprocess.run(
            ["git", "diff", "--name-only", "HEAD~1"],
            cwd=ROOT, capture_output=True, text=True, check=False,
        ).stdout
    return [
        os.path.join(ROOT, path)
        for path in out.split()
        if path.endswith(".json") and "queue-published" in path and os.path.exists(os.path.join(ROOT, path))
    ]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--changed", action="store_true", help="лише змінені файли")
    parser.add_argument("--stats", action="store_true", help="показати, у скількох уроках стоїть кожен тег")
    args = parser.parse_args()

    canon, aliases, service = load_registry()

    if args.changed:
        paths = changed_files()
        if not paths:
            print("check_tags: змінених файлів вправ немає")
            return 0
    else:
        paths = [
            os.path.join(CONTENT_DIR, name)
            for name in sorted(os.listdir(CONTENT_DIR))
            if name.endswith(".json")
        ]

    unknown: dict[str, set[str]] = defaultdict(set)
    per_tag_lessons: dict[str, set[str]] = defaultdict(set)
    broken: list[str] = []

    for path in paths:
        name = os.path.basename(path)
        try:
            with open(path, encoding="utf-8") as fh:
                data = json.load(fh)
        except (OSError, json.JSONDecodeError) as exc:
            broken.append(f"{name}: {exc}")
            continue
        found: set[str] = set()
        walk(data, found)
        for tag in found:
            resolved = aliases.get(tag, tag)
            if resolved not in canon:
                unknown[tag].add(name)
            elif resolved not in service:
                per_tag_lessons[resolved].add(lesson_id(name))

    if broken:
        print("НЕЧИТАЄТЬСЯ:")
        for line in broken:
            print(f"  {line}")

    if args.stats:
        singles = sorted(tag for tag, lessons in per_tag_lessons.items() if len(lessons) < 2)
        print(f"тегів у вжитку: {len(per_tag_lessons)}")
        print(f"закріплені у 2+ уроках (рахуються в mastery): {len(per_tag_lessons) - len(singles)}")
        if singles:
            print("лише в одному уроці — mastery за ними не порахується:")
            for tag in singles:
                print(f"  {tag}: {sorted(per_tag_lessons[tag])[0]}")

    if unknown:
        print(f"\nНЕВІДОМІ ТЕГИ: {len(unknown)}")
        for tag in sorted(unknown):
            files = ", ".join(sorted(unknown[tag])[:3])
            print(f"  {tag}  →  {files}")
        print(
            "\nТег береться лише з docs/grammar-registry.json. Якщо тема справді нова —\n"
            "спершу рядок у claude/GRAMMAR_REGISTRY.md + insert у course_grammar_points,\n"
            "потім урок. Синонімів не додаємо."
        )
        return 1

    print(f"check_tags: чисто ({len(paths)} файлів)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
