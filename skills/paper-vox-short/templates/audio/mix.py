"""Voice + SFX (+ music bed) -> audio/out/final_mix.wav (48 kHz / 24-bit stereo, -14 LUFS, TP <= -1 dBTP).

    .venv/bin/python mix.py [--sfx-db 3] [--music audio/music.mp3 --music-db -20 --music-start 0]
    # --sfx-db: trim the whole SFX bus (e.g. -3 = quieter)
    # --music-db: music RMS relative to the voice's speech RMS while the narrator talks (it rises
    #   MUSIC_DUCK_DB in pauses); fades in/out, trimmed to the voice length. out/ab/music_only.wav

Cues come from data/sfx_cues.json (written by the app from the same times the animations use).
Each cue is synthesized by sfx.py with a seed from its index, placed at t, panned by x, then the
SFX bus is ducked under the voice (envelope follower, up to DUCK_DB) and summed with the voice.
Writes out/ab/sfx_only.wav too, to judge the SFX on their own.
"""
import argparse
import json
import subprocess
import tempfile
from pathlib import Path

import numpy as np
import soundfile as sf
from scipy.ndimage import maximum_filter1d, uniform_filter1d

import sfx

ROOT = Path(__file__).resolve().parent.parent
SR = sfx.SR

# peak level of each kind in dBFS before ducking; the voice peaks around -1 dBFS
LEVEL = {"stamp": -13, "slap": -19, "paper": -23, "tape": -22, "whoosh": -24, "tick": -27, "type": -27,
         "cross": -23, "fan": -29, "hiss": -24, "pop": -24}
DUCK_DB = 5.0          # SFX dip this much while the narrator speaks
MUSIC_DUCK_DB = 6.0    # music dips this much while the narrator speaks
MUSIC_FADE_IN, MUSIC_FADE_OUT = 0.5, 2.0
MAX_PAN = 0.5          # |x| = 1 pans this far (0 = centre, 1 = hard side)
TARGET_LUFS, TP_LIMIT = -14.0, -1.0


def place(bus, y, t):
    i = int(round(t * SR))
    if i >= len(bus) or i + len(y) <= 0:
        return
    a, b = max(0, -i), min(len(y), len(bus) - i)
    bus[i + a:i + b] += y[a:b]


def speech_activity(voice):
    """0..1 per 5 ms hop: narrator speaking (held 120 ms past each syllable, 80 ms smoothing)."""
    hop = SR // 200  # 5 ms
    n = len(voice) // hop
    rms = np.sqrt(uniform_filter1d(voice[: n * hop] ** 2, hop)[::hop][:n] + 1e-12)
    db = 20 * np.log10(rms)
    active = (db > db.max() - 35).astype(float)
    active = maximum_filter1d(active, 24)          # hold 120 ms past each syllable
    active = uniform_filter1d(active, 16)          # 80 ms smoothing (attack/release)
    return np.interp(np.arange(len(voice)), np.arange(n) * hop + hop / 2, active)


def duck_gain(voice, depth_db=DUCK_DB, active=None):
    """Per-sample gain for a bed under the voice: 1 in pauses, 10^(-depth_db/20) under speech."""
    active = speech_activity(voice) if active is None else active
    return 10 ** (-depth_db * active / 20)


def music_bed(path, voice, active, music_db, start):
    """Music trimmed/looped to the voice, faded, ducked; level set against the voice's speech RMS."""
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{start}", "-i", str(path), "-ac", "2", "-ar", str(SR),
                          "-f", "f32le", "-"], capture_output=True, check=True).stdout
    m = np.frombuffer(raw, np.float32).astype(np.float64).reshape(-1, 2)
    m = np.resize(m, (len(voice), 2)) if len(m) < len(voice) else m[: len(voice)]
    speech = voice[active > 0.5]
    v_rms = np.sqrt(np.mean(speech ** 2)) if len(speech) else np.sqrt(np.mean(voice ** 2))
    m_rms = np.sqrt(np.mean(m ** 2)) + 1e-12
    # music_db is the level *while ducked* (i.e. under speech)
    g = v_rms / m_rms * 10 ** ((music_db + MUSIC_DUCK_DB) / 20)
    env = np.ones(len(m))
    fi, fo = int(MUSIC_FADE_IN * SR), int(MUSIC_FADE_OUT * SR)
    env[:fi] = np.linspace(0, 1, fi)
    env[-fo:] *= np.linspace(1, 0, fo) ** 2
    return m * (g * env * duck_gain(voice, MUSIC_DUCK_DB, active))[:, None]


def ffmpeg_loudness(path):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(path), "-af", "ebur128=peak=true",
                        "-f", "null", "-"], capture_output=True, text=True).stderr
    summ = r[r.rfind("Summary:"):]
    I = float(summ.split("I:")[1].split("LUFS")[0])
    TP = float(summ.split("Peak:")[1].split("dBFS")[0])
    return I, TP


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--sfx-db", type=float, default=3.0)  # +3: at 0 the SFX read too quiet on the first video
    ap.add_argument("--cues", default=str(ROOT / "data/sfx_cues.json"))
    ap.add_argument("--out", default=str(ROOT / "audio/out/final_mix.wav"))
    ap.add_argument("--music", default="")
    ap.add_argument("--music-db", type=float, default=-20.0)
    ap.add_argument("--music-start", type=float, default=0.0)
    a = ap.parse_args()

    voice, sr = sf.read(ROOT / "audio/out/voice_master.wav", always_2d=True)
    assert sr == SR
    voice = voice.mean(1)
    cues = json.loads(Path(a.cues).read_text())["cues"]

    bus = np.zeros((len(voice), 2))
    counts = {}
    for i, c in enumerate(cues):
        kind = c["kind"]
        if kind not in sfx.VOICES:
            print(f"  skip unknown kind {kind!r} at {c['t']}")
            continue
        y = sfx.render(kind, 7919 * i + 17, c.get("dur"))
        g = 10 ** ((LEVEL[kind] + a.sfx_db) / 20) * float(c.get("gain", 1.0))
        pan = float(np.clip(c.get("x", 0.0), -1, 1)) * MAX_PAN
        lr = np.array([np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)]) * np.sqrt(2)
        place(bus, y * g * lr, c["t"])
        counts[kind] = counts.get(kind, 0) + 1

    active = speech_activity(voice)
    bus *= duck_gain(voice, DUCK_DB, active)[:, None]
    mix = bus + voice[:, None]
    (ROOT / "out/ab").mkdir(parents=True, exist_ok=True)
    sf.write(ROOT / "out/ab/sfx_only.wav", bus, SR, subtype="PCM_24")
    if a.music:
        music = music_bed(ROOT / a.music, voice, active, a.music_db, a.music_start)
        mix += music
        sf.write(ROOT / "out/ab/music_only.wav", music, SR, subtype="PCM_24")
        sp = active > 0.5
        rel = 20 * np.log10(np.sqrt(np.mean(music[sp] ** 2)) / np.sqrt(np.mean(voice[sp] ** 2)))
        print(f"music {Path(a.music).name}: {rel:+.1f} dB vs voice under speech")

    # loudness: measure, apply one static gain, then a true-peak-aware limiter (oversampled) in ffmpeg
    with tempfile.TemporaryDirectory() as d:
        raw = Path(d) / "raw.wav"
        sf.write(raw, mix, SR, subtype="FLOAT")
        I, _ = ffmpeg_loudness(raw)
        gain = TARGET_LUFS - I
        out = Path(a.out)
        lim = 10 ** ((TP_LIMIT - 0.3) / 20)
        subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(raw), "-af",
                        f"volume={gain:.2f}dB,aresample=192000,alimiter=limit={lim:.4f}:attack=1:release=60:"
                        f"level=disabled,aresample=48000", "-c:a", "pcm_s24le", str(out)], check=True)
    I, TP = ffmpeg_loudness(out)
    print("cues: " + ", ".join(f"{k} {v}" for k, v in sorted(counts.items())))
    print(f"wrote {out.name}  I {I:.1f} LUFS  TP {TP:.1f} dBTP  ({len(mix) / SR:.2f} s)")


if __name__ == "__main__":
    main()
