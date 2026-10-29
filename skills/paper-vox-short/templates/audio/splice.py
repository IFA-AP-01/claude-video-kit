"""Replace bad stretches of the main voice with re-read takes -> voice_fixed.wav (before enhance/master).

    audio/.venv/bin/python audio/splice.py voice.mp3 --cut 85.1 --takes voice2.mp3 voice3.mp3 \
        [--out voice_fixed.wav] [--gap 0.6] [--close 66.18:66.52 ...] [--keep 0.04]

Keeps the main voice up to --cut (a time inside a pause, from a word-timestamped transcript:
audio/transcribe.py), then appends each take in order. Every piece is trimmed to its speech
(energy gate) and joined with --gap seconds of the main voice's own room tone, takes are matched
to the main voice's speech RMS, joins get 15 ms fades. Writes out/ab/splice_<n>.wav (±3 s around
each join) to check by ear / by re-transcribing.
"""
import argparse
import subprocess
from pathlib import Path

import numpy as np
import soundfile as sf
from scipy.ndimage import uniform_filter1d

ROOT = Path(__file__).resolve().parent.parent
SR = 24000
FADE = int(0.015 * SR)


def load(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).astype(np.float64)


def env_db(y):
    hop = SR // 100  # 10 ms
    n = len(y) // hop
    rms = np.sqrt(uniform_filter1d(y[: n * hop] ** 2, hop)[::hop][:n] + 1e-12)
    return 20 * np.log10(rms), hop


def speech_bounds(y, floor_db=40):
    db, hop = env_db(y)
    on = np.flatnonzero(db > db.max() - floor_db)
    return on[0] * hop, (on[-1] + 1) * hop


def speech_rms(y):
    db, hop = env_db(y)
    act = db > db.max() - 30
    frames = y[: len(db) * hop].reshape(-1, hop)[act]
    return np.sqrt(np.mean(frames ** 2))


def fade(y):
    y = y.copy()
    r = np.linspace(0, 1, FADE)
    y[:FADE] *= r
    y[-FADE:] *= r[::-1]
    return y


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("main")
    ap.add_argument("--cut", type=float, required=True)
    ap.add_argument("--takes", nargs="+", required=True)
    ap.add_argument("--gap", type=float, default=0.6)
    ap.add_argument("--close", nargs="*", default=[], type=lambda s: tuple(map(float, s.split(":"))),
                    help="A:B main-voice pauses (s, before --cut) to shrink to --keep")
    ap.add_argument("--keep", type=float, default=0.04)
    ap.add_argument("--out", default=str(ROOT / "voice_fixed.wav"))
    a = ap.parse_args()

    v1 = load(a.main)
    head = v1[: int(a.cut * SR)]
    s0, s1 = speech_bounds(head)
    head = head[:s1]  # end of the last kept word
    # dead-air holes inside a phrase (TTS read a comma that isn't there): shrink each to --keep
    for c in sorted(a.close, key=lambda r: -r[0]):
        i0, i1 = int(c[0] * SR), int((c[1] - a.keep) * SR)
        if i1 > i0 and c[1] <= a.cut:
            j = min(FADE, i0, len(head) - i1)
            x = np.linspace(0, 1, j)
            head = np.concatenate([head[:i0 - j], head[i0 - j:i0] * x[::-1] + head[i1:i1 + j] * x, head[i1 + j:]])
            print(f"  closed {c[0]:.2f}-{c[1]:.2f} s in main voice (-{(i1 - i0) / SR:.2f} s)")
    ref = speech_rms(v1)
    # room tone: the quietest 0.3 s of the main voice, looped for the gaps
    db, hop = env_db(v1)
    k = int(np.argmin(uniform_filter1d(db, 30)[15:-15])) + 15
    tone = v1[(k - 15) * hop:(k + 15) * hop]
    gap = np.resize(tone, int(a.gap * SR))

    pieces, joins = [fade(head)], []
    for t in a.takes:
        y = load(t)
        b0, b1 = speech_bounds(y)
        y = y[max(0, b0 - int(0.03 * SR)):b1] * (ref / speech_rms(y))
        joins.append(sum(map(len, pieces)) + len(gap) // 2)
        pieces += [gap, fade(y)]
        print(f"  {Path(t).name}: speech {b0 / SR:.2f}-{b1 / SR:.2f} s, gain {20 * np.log10(ref / speech_rms(load(t))):+.1f} dB")
    pieces.append(np.resize(tone, int(0.25 * SR)))
    out = np.concatenate(pieces)
    peak = np.abs(out).max()
    if peak > 0.99:
        out *= 0.99 / peak
    sf.write(a.out, out, SR, subtype="PCM_24")

    ab = ROOT / "out/ab"
    ab.mkdir(parents=True, exist_ok=True)
    for i, j in enumerate(joins, 1):
        sf.write(ab / f"splice_{i}.wav", out[max(0, j - 3 * SR):j + 3 * SR], SR, subtype="PCM_24")
    print(f"kept main 0-{len(head) / SR:.2f} s; joins at " + ", ".join(f"{j / SR:.2f}" for j in joins)
          + f" s -> {Path(a.out).name} ({len(out) / SR:.2f} s)")


if __name__ == "__main__":
    main()
