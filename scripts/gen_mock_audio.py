#!/usr/bin/env python3
"""
Generate listening audio for a mock exam from the transcripts in its JSON (ElevenLabs).

Usage:
  export ELEVENLABS_API_KEY=...
  python3 scripts/gen_mock_audio.py pl-b1-probny-05            # dry run: shows lines, voices, character count
  python3 scripts/gen_mock_audio.py pl-b1-probny-05 --yes      # generate (costs credits)
  python3 scripts/gen_mock_audio.py pl-b1-probny-05 --yes --task rs3   # one task only

Voices and emotion tags: scripts/mock_audio/{lesson_id}.voices.json
  tasks.{task}.voices     — speaker name -> voice code, for the whole task
  tasks.{task}.segments   — list (segment 0 = example, then numer/dialog 1, 2…) of {speaker: code}
  tasks.{task}.tags       — {segment index: "[surprised]"} added in front of non-Lektor lines
  tasks.{task}.block_gap  — seconds of silence between blocks (blank line in the transcript)
  tasks.{task}.gaps       — {block index: seconds} overrides block_gap before that block (e.g. 60 s reading time)
A new segment starts at every block that begins with "Lektor:" (after the first one).
Repeated blocks reuse the cached clip, so a dialog heard twice is billed once and sounds identical.

Output: public/audio/{lesson_id}/b1-sluchanie-{n}.mp3 (mono, 64 kbit/s, loudnorm −16 LUFS).
Clips are cached in .audio-cache/{lesson_id}/ (git-ignored); re-runs never pay twice for the same line.
"""
import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
import urllib.request

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
API = "https://api.elevenlabs.io/v1/text-to-speech/{voice}?output_format=mp3_44100_128"
LINE_GAP = 0.45
AFTER_LEKTOR = 0.7


def load(lesson_id):
    with open(os.path.join(ROOT, "src", "content", "queue-published", f"{lesson_id}-mock.json"), encoding="utf-8") as f:
        exam = json.load(f)
    with open(os.path.join(ROOT, "scripts", "mock_audio", f"{lesson_id}.voices.json"), encoding="utf-8") as f:
        cfg = json.load(f)
    return exam, cfg


def plan_task(task, tcfg, cast):
    """-> list of blocks; block = list of (voice_id, text) ; plus block gaps."""
    blocks = [b.strip() for b in task["transcript"].split("\n\n") if b.strip()]
    seg = 0
    out = []
    for bi, block in enumerate(blocks):
        lines = [l for l in block.split("\n") if l.strip()]
        if bi > 0 and lines[0].startswith("Lektor:") and len(lines) > 1:
            seg += 1
        clips = []
        for line in lines:
            m = re.match(r"^([^:]{1,40}):\s*(.+)$", line)
            if not m:
                sys.exit(f"{task['id']}: line without speaker: {line!r}")
            speaker, text = m.group(1).strip(), m.group(2).strip()
            seg_map = tcfg.get("segments", [])
            code = (seg_map[seg].get(speaker) if seg < len(seg_map) else None) or tcfg.get("voices", {}).get(speaker)
            if not code:
                sys.exit(f"{task['id']}: no voice for speaker {speaker!r} in segment {seg}")
            if speaker != "Lektor":
                tag = tcfg.get("tags", {}).get(str(seg))
                if tag:
                    text = f"{tag} {text}"
            clips.append((speaker, code, cast[code], text))
        out.append(clips)
    return out


def tts(voice_id, text, model, cache_dir, key):
    h = hashlib.sha1(f"{model}|{voice_id}|{text}".encode()).hexdigest()[:16]
    path = os.path.join(cache_dir, f"{h}.mp3")
    if os.path.exists(path) and os.path.getsize(path) > 0:
        return path
    body = json.dumps({"text": text, "model_id": model}).encode()
    req = urllib.request.Request(API.format(voice=voice_id), data=body, method="POST",
                                 headers={"xi-api-key": key, "Content-Type": "application/json", "Accept": "audio/mpeg"})
    with urllib.request.urlopen(req, timeout=180) as r:
        data = r.read()
    with open(path, "wb") as f:
        f.write(data)
    return path


def silence(sec, cache_dir):
    path = os.path.join(cache_dir, f"sil_{int(sec * 1000)}.wav")
    if not os.path.exists(path):
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono",
                        "-t", str(sec), path], check=True)
    return path


def trim(src, cache_dir):
    dst = src.replace(".mp3", ".trim.wav")
    if not os.path.exists(dst):
        f = ("silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.15,"
             "areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.2,areverse")
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", src, "-ac", "1", "-ar", "44100", "-af", f, dst], check=True)
    return dst


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("lesson_id")
    ap.add_argument("--yes", action="store_true", help="really call ElevenLabs (costs credits)")
    ap.add_argument("--task", help="only this task id (e.g. rs3)")
    ap.add_argument("--model", default=None)
    a = ap.parse_args()

    exam, cfg = load(a.lesson_id)
    model = a.model or cfg.get("model", "eleven_v3")
    cast = cfg["cast"]
    tasks = [t for s in exam["sections"] for t in s["tasks"] if t.get("transcript")]
    if a.task:
        tasks = [t for t in tasks if t["id"] == a.task]

    plans, chars, seen = {}, 0, set()
    for t in tasks:
        plans[t["id"]] = plan_task(t, cfg["tasks"][t["id"]], cast)
        for block in plans[t["id"]]:
            for spk, code, vid, text in block:
                if (vid, text) not in seen:
                    seen.add((vid, text))
                    chars += len(text)
    print(f"{a.lesson_id}: {len(seen)} unique clips, ~{chars} characters (≈ credits), model {model}")
    if not a.yes:
        for tid, blocks in plans.items():
            print(f"\n== {tid}")
            for block in blocks:
                for spk, code, vid, text in block:
                    print(f"  [{code:3}] {spk}: {text[:90]}")
                print("  ·")
        print("\nDry run. Add --yes to generate.")
        return

    key = os.environ.get("ELEVENLABS_API_KEY")
    if not key:
        sys.exit("Set ELEVENLABS_API_KEY")
    cache_dir = os.path.join(ROOT, ".audio-cache", a.lesson_id)
    out_dir = os.path.join(ROOT, "public", "audio", a.lesson_id)
    os.makedirs(cache_dir, exist_ok=True)
    os.makedirs(out_dir, exist_ok=True)

    for t in tasks:
        tcfg = cfg["tasks"][t["id"]]
        parts = []
        for bi, block in enumerate(plans[t["id"]]):
            if bi:
                parts.append(silence(float(tcfg.get("gaps", {}).get(str(bi), tcfg.get("block_gap", 2.0))), cache_dir))
            for li, (spk, code, vid, text) in enumerate(block):
                if li:
                    parts.append(silence(AFTER_LEKTOR if block[li - 1][0] == "Lektor" else LINE_GAP, cache_dir))
                print(f"  {t['id']} [{code}] {text[:60]}")
                parts.append(trim(tts(vid, text, model, cache_dir, key), cache_dir))
        lst = os.path.join(cache_dir, f"{t['id']}.txt")
        with open(lst, "w") as f:
            f.writelines(f"file '{os.path.abspath(p)}'\n" for p in parts)
        out = os.path.join(out_dir, os.path.basename(t["audio"]["src"]))
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lst,
                        "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ac", "1", "-ar", "44100", "-b:a", "64k", out], check=True)
        print(f"→ {out}")
    print("Done. Listen to every number, name and the P1 emotions before publishing.")


if __name__ == "__main__":
    main()
