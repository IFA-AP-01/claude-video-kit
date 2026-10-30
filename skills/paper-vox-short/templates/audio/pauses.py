"""Breathing room for a voice read in one go: widen the pauses between scenes, paragraphs and sentences.

    audio/.venv/bin/python audio/pauses.py [--section 2.0] [--para 1.6] [--sentence 0.7]

Reads audio/out/voice_master.wav + data/words.json (after make.sh align). Every gap between two
lines shorter than its target (section change > paragraph break in the script > sentence end) is
widened to the target with the gap's own room tone (quietest 0.24 s of the gap, tiled with
equal-power crossfades), spliced in the middle of the gap. Word, line, section and extra times in
words.json and the stinger plan's t are shifted to match. Targets are minimums, so a second run
adds nothing. The inserted pauses are listed in words.json "pauses" ([at, added] in the old time base
of each run).
"""
import argparse
import json
import re
from pathlib import Path

import numpy as np
import soundfile as sf

ROOT = Path(__file__).resolve().parent.parent
XF = 0.03
WIN = 0.24


def norm(s):
    return re.sub(r"[^a-z0-9]", "", s.lower())


def para_ends(script, lines):
    """indices of lines that end a paragraph of the script"""
    paras = [p for p in re.split(r"\n\s*\n|\n(?=\[)", script) if p.strip()]
    paras = [norm(re.sub(r"^\[.*?\]\s*", "", p.strip())) for p in paras]
    paras = [p for p in paras if p]
    ends, k, acc = set(), 0, ""
    for l in lines:
        acc += norm(l["text"])
        while k < len(paras) and len(acc) >= len(paras[k]):
            if acc[: len(paras[k])] == paras[k]:
                ends.add(l["i"])
            acc = acc[len(paras[k]):]
            k += 1
    return ends


def tone(y, sr, a, b, n):
    """n samples of room tone from the quietest window of y[a:b]"""
    w = int(WIN * sr)
    lo, hi = a + int(0.06 * sr), b - int(0.06 * sr)
    if hi - lo <= w:
        seg = y[lo:hi] if hi > lo else np.zeros(w)
    else:
        step = sr // 100
        starts = range(lo, hi - w, step)
        best = min(starts, key=lambda s: np.mean(y[s:s + w] ** 2))
        seg = y[best:best + w]
    x = int(XF * sr)
    r = np.sqrt(np.linspace(0, 1, x))
    out = seg.copy()
    while len(out) < n + x:
        out = np.concatenate([out[:-x], out[-x:] * r[::-1] + seg[:x] * r, seg[x:]])
    return out[:n]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--section", type=float, default=2.0)
    ap.add_argument("--para", type=float, default=1.6)
    ap.add_argument("--sentence", type=float, default=0.7)
    a = ap.parse_args()

    wav = ROOT / "audio/out/voice_master.wav"
    wj = ROOT / "data/words.json"
    W = json.loads(wj.read_text())
    bf = ROOT / "BRIEF.md"
    brief = bf.read_text() if bf.exists() else ""
    m = re.search(r"^SCRIPT=(\S+)", brief, re.M)
    script = (ROOT / (m.group(1) if m else "script.txt")).read_text()
    y, sr = sf.read(wav, dtype="float64", always_2d=False)
    info = sf.info(wav)

    L = W["lines"]
    pends = para_ends(script, L)
    ins = []
    for p, q in zip(L, L[1:]):
        gap = q["start"] - p["end"]
        if p["section"] != q["section"]:
            want, kind = a.section, "section"
        elif p["i"] in pends:
            want, kind = a.para, "paragraph"
        elif re.search(r"[.?!…][\"”’)]*$", p["text"].strip()):
            want, kind = a.sentence, "sentence"
        else:
            continue
        add = round(want - gap, 3)
        if add >= 0.05:
            ins.append(((p["end"] + q["start"]) / 2, add, kind, p["end"], q["start"]))
    if not ins:
        print("pauses: nothing to add")
        return

    x = int(XF * sr)
    r = np.sqrt(np.linspace(0, 1, x))
    parts, prev = [], 0
    for at, add, _, ge, gs in ins:
        c = int(at * sr)
        t = tone(y, sr, int(ge * sr), int(gs * sr), int(add * sr) + 2 * x)
        head = y[prev:c]
        tail_x = y[c:c + x]
        t[:x] = head[-x:] * r[::-1] + t[:x] * r
        t[-x:] = t[-x:] * r[::-1] + tail_x * r
        parts += [head[:-x], t]
        prev = c + x
    parts.append(y[prev:])
    out = np.concatenate(parts)

    def shift(v):
        return round(v + sum(add for at, add, *_ in ins if at < v), 3)

    for l in L:
        l["start"], l["end"] = shift(l["start"]), shift(l["end"])
        for w in l["words"]:
            w["start"], w["end"] = shift(w["start"]), shift(w["end"])
    for s in W["sections"]:
        s["start"], s["end"] = shift(s["start"]), shift(s["end"])
    for e in W.get("extras", []):
        e["start"], e["end"] = shift(e["start"]), shift(e["end"])
    total = sum(add for _, add, *_ in ins)
    W["duration"] = round(W["duration"] + total, 3)
    W.setdefault("pauses", []).append([[round(at, 3), add] for at, add, *_ in ins])

    m = re.search(r"^STINGS=(\S+)", brief, re.M)
    if m and (ROOT / m.group(1)).exists():
        sp = ROOT / m.group(1)
        P = json.loads(sp.read_text())
        for c in P.get("cues", []):
            c["t"] = shift(c["t"])
        sp.write_text(json.dumps(P, ensure_ascii=False, indent=2) + "\n")

    sf.write(wav, out, sr, subtype=info.subtype)
    wj.write_text(json.dumps(W, ensure_ascii=False, separators=(",", ":")))
    kinds = {}
    for _, add, kind, *_ in ins:
        kinds.setdefault(kind, [0, 0.0])
        kinds[kind][0] += 1
        kinds[kind][1] += add
    for k, (n, s) in kinds.items():
        print(f"  {k:<9} {n:3d} pauses  +{s:5.1f} s")
    print(f"pauses: +{total:.1f} s -> {len(out) / sr:.2f} s")


if __name__ == "__main__":
    main()
