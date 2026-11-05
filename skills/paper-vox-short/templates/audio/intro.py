"""Quiet opening before the first word, so viewers settle in before the voice starts.

    audio/.venv/bin/python audio/intro.py --intro 4.5

Pads the start of audio/out/voice_master.wav with its own room tone (the quietest 0.24 s before the
first word, tiled with equal-power crossfades) until the first word starts at --intro seconds, and
shifts every time in data/words.json (lines, words, sections, extras, duration) and the stinger plan's
t by the same amount. A minimum, so a second run adds nothing. words.json "intro" records the target.
"""
import argparse
import json, sys
from pathlib import Path

import numpy as np
import soundfile as sf

ROOT = Path(__file__).resolve().parent.parent
XF = 0.03
WIN = 0.24


def room_tone(x, sr, end, n):
    w = int(WIN * sr)
    seg = x[: max(int(end * sr), w)]
    hop = max(1, w // 4)
    best, k = None, 0
    for i in range(0, max(1, len(seg) - w), hop):
        e = float(np.mean(seg[i : i + w] ** 2))
        if best is None or e < best:
            best, k = e, i
    tile = seg[k : k + w]
    xf = int(XF * sr)
    fade = np.sin(np.linspace(0, np.pi / 2, xf))[:, None] ** 2
    out = tile.copy()
    while len(out) < n + xf:
        a, b = out[-xf:] * (1 - fade), tile[:xf] * fade
        out = np.concatenate([out[:-xf], a + b, tile[xf:]])
    return out[:n]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--intro", type=float, default=0.0)
    a = ap.parse_args()
    wp = ROOT / "data/words.json"
    W = json.loads(wp.read_text())
    first = min(w["start"] for l in W["lines"] for w in l["words"])
    pad = round(a.intro - first, 3)
    if abs(pad) <= 0.0005:
        print(f"intro: first word at {first:.2f} s, nothing to change")
        return
    vp = ROOT / "audio/out/voice_master.wav"
    x, sr = sf.read(vp, always_2d=True)
    info = sf.info(vp)
    if pad < 0:
        if a.intro < 0.3:
            sys.exit("intro: refusing to trim closer than 0.3 s to the first word")
        cut = int(round(-pad * sr))
        xf = int(XF * sr)
        y = x[cut:].copy()
        y[:xf] *= (np.sin(np.linspace(0, np.pi / 2, xf)) ** 2)[:, None]
        sf.write(vp, y, sr, subtype=info.subtype)
    else:
        n = int(round(pad * sr))
        tone = room_tone(x, sr, first, n)
        xf = int(XF * sr)
        fade = np.sin(np.linspace(0, np.pi / 2, xf))[:, None] ** 2
        head = tone.copy()
        head[:xf] *= fade
        sf.write(vp, np.concatenate([head, x]), sr, subtype=info.subtype)

    sh = lambda t: round(t + pad, 3)
    for l in W["lines"]:
        l["start"], l["end"] = sh(l["start"]), sh(l["end"])
        for w in l["words"]:
            w["start"], w["end"] = sh(w["start"]), sh(w["end"])
    for s in W.get("sections", []):
        s["start"], s["end"] = sh(s["start"]), sh(s["end"])
    for e in W.get("extras", []):
        e["start"], e["end"] = sh(e["start"]), sh(e["end"])
    if "duration" in W:
        W["duration"] = sh(W["duration"])
    W["intro"] = a.intro
    wp.write_text(json.dumps(W, ensure_ascii=False, indent=1))

    sp = ROOT / "audio/sting/plan.json"
    if sp.exists():
        P = json.loads(sp.read_text())
        for c in P.get("cues", []):
            if "t" in c:
                c["t"] = sh(c["t"])
        sp.write_text(json.dumps(P, indent=2))
    print(f"intro: {'added' if pad > 0 else 'trimmed'} {abs(pad):.2f} s of room tone, first word now at {a.intro:.2f} s")


if __name__ == "__main__":
    main()
