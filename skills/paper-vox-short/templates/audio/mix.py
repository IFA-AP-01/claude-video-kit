"""Voice + SFX (+ music bed) -> audio/out/final_mix.wav (48 kHz / 24-bit stereo, -14 LUFS, TP <= -1 dBTP).

    .venv/bin/python mix.py [--sfx-db 3] [--music audio/music.mp3 --music-db -20 --music-start 0]
    # --sfx-db: trim the whole SFX bus (e.g. -3 = quieter)
    # --music-db: music RMS relative to the voice's speech RMS while the narrator talks (it rises
    #   MUSIC_DUCK_DB in pauses); fades in/out, trimmed to the voice length. out/ab/music_only.wav
    # --music audio/music/plan.json: one track per story phase instead of one bed, e.g.
    #   {"xfade": 2.0, "phases": [{"from": "chosen_one", "to": "no_magic", "file": "magical_childhood",
    #    "db": 0, "start": 0}, ...]}
    #   phase spans come from the scene sections in film/assets/data/words.js; "file" is matched by
    #   normalized stem in the plan's folder (missing files are skipped with a warning); each phase is
    #   levelled on its own (K-weighted, like LUFS), so --music-db holds across tracks; "db" trims one
    #   phase; equal-power crossfades of "xfade" s centred on phase boundaries (cartoon-explainer layout).

Cues come from data/sfx_cues.json (written by the app from the same times the animations use).
Each cue is synthesized by sfx.py with a seed from its index, placed at t, panned by x, then the
SFX bus is ducked under the voice (envelope follower, up to DUCK_DB) and summed with the voice.
Cue kinds "amb" (looped bed over t..t+dur) and "clip" (one-shot) play recordings from audio/amb/;
beds go on their own bus, ducked AMB_DUCK_DB under the voice, crossfading at cuts.
Writes out/ab/sfx_only.wav and out/ab/amb_only.wav too, to judge each bus on its own.

--stings audio/sting/plan.json: situational stingers (short musical/comic cues on story beats), e.g.
    {"cues": [{"t": 15.82, "file": "sad-piano", "db": 0, "gap": 0.15, "dur": 3}, ...]}
    t = end of the cue line; the sting starts "gap" s later, or at the first pause within 1 s after that
    (word ends from the aligner can run early; leading silence trimmed), levelled on its
    active part to STING_DB vs the voice's speech RMS, peak capped STING_CREST above that, softened like
    the SFX bus, ducked STING_DUCK_DB under speech; the music dips STING_MUSIC_DIP_DB while a sting plays.
    Writes out/ab/sting_only.wav.
"""
import argparse
import json
import subprocess
import tempfile
from pathlib import Path

import numpy as np
import soundfile as sf
from scipy.ndimage import maximum_filter1d, uniform_filter1d
from scipy.signal import butter, sosfilt

import sfx

ROOT = Path(__file__).resolve().parent.parent
SR = sfx.SR

# peak level of each kind in dBFS before ducking; the voice peaks around -1 dBFS
LEVEL = {"stamp": -13, "slap": -19, "paper": -23, "tape": -22, "whoosh": -24, "tick": -27, "type": -27,
         "cross": -23, "fan": -29, "hiss": -24, "pop": -24,
         "spell": -22, "blast": -16, "thunder": -17, "clang": -21, "warp": -22,
         "night": -18, "traffic": -18, "crowd": -18, "family": -18, "office": -20, "room": -22,
         "laugh": -18, "cackle": -18,
         "step": -31, "hop": -28, "slide": -28, "creak": -29, "coin": -28}

# tone policy: in tender scenes (every scene not listed in --light) comic kinds read as jokes, so they are
# dropped or swapped for a soft paper rustle; light (ironic) scenes keep them, a step softer
COMIC_DROP = {"slap", "hop", "slide", "laugh", "cackle"}
COMIC_SOFT = {"pop": "paper", "stamp": "paper"}
TENDER_TRIM = {"tick": -6, "whoosh": -6, "clang": -6, "paper": -4}
LIGHT_TRIM = {"pop": -5, "stamp": -6, "slap": -4, "hop": -4}

# real recorded samples (audio/sfxlib/<kind>_NN.wav) replace the synth voice of a kind; variants rotate per cue
SAMPLE_DIR = ROOT / "audio/sfxlib"
SAMPLE_MAX = 2.5       # long tails (booms) are cut here with a fade unless the cue passes dur
_samples = {}


def samples(kind):
    if kind not in _samples:
        out = []
        for f in sorted(SAMPLE_DIR.glob(f"{kind}_*.wav")):
            raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(f), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                                 capture_output=True, check=True).stdout
            y = np.frombuffer(raw, np.float32).astype(np.float64)
            on = int(np.argmax(np.abs(y) > np.abs(y).max() * 0.05))
            y = y[max(0, on - int(0.005 * SR)):]
            out.append(y / (np.abs(y).max() + 1e-12))
        _samples[kind] = out
    return _samples[kind]


def sample(kind, i, dur):
    v = samples(kind)
    y = v[i % len(v)].copy()
    n = min(len(y), int((dur or SAMPLE_MAX) * SR))
    y = y[:n]
    fo = min(n, int(0.12 * SR))
    y[n - fo:] *= np.cos(np.linspace(0, np.pi / 2, fo)) ** 2
    return y
DUCK_DB = 5.0          # SFX dip this much while the narrator speaks
MUSIC_DUCK_DB = 6.0    # music dips this much while the narrator speaks
MUSIC_FADE_IN, MUSIC_FADE_OUT = 0.5, 2.0
MUSIC_PLAN_FADE_OUT = 3.0     # phase plans end on a longer fade
MUSIC_HP = 60                 # music: no rumble under the voice
MUSIC_DIP = (2500, -3.0, 1.0)  # peaking cut (Hz, dB, Q) that clears the voice's presence band
BUS_DIP = (3800, -3.5, 0.8)    # SFX and ambience buses: soften 2-6 kHz (clicks, whooshes, crickets) for comfort
BUS_LP = 13000                 # and no fizz above it
MAX_PAN = 0.5          # |x| = 1 pans this far (0 = centre, 1 = hard side)
TARGET_LUFS, TP_LIMIT = -14.0, -1.0

# ambience beds and one-shot recordings (cue kinds "amb" / "clip", files in audio/amb/)
AMB_DIR = ROOT / "audio/amb"
AMB_DB = -20.0         # bed RMS vs the voice's speech RMS in pauses (dips AMB_DUCK_DB under speech)
AMB_DUCK_DB = 6.0
AMB_XFADE = 0.15       # beds overlap this much at a cut (equal power), centred on it
AMB_LOOP_XFADE = 0.5   # crossfade where a short recording wraps around
AMB_EDGE = 0.3         # trimmed off both ends of a recording (stock clips have baked fades)
AMB_HP, AMB_LP = 80, 12000   # no rumble/mud under the voice, no fizz above it
CLIP_ONSET_DB = -30    # a one-shot starts where it first rises within this of its peak

# situational stingers (--stings plan, files in the plan's folder)
STING_DB = -12.0       # active-part RMS vs the voice's speech RMS (they play in pauses)
STING_CREST = 9.0      # peak at most this many dB above STING_DB: no harsh hits
STING_DUCK_DB = 8.0
STING_GAP = 0.15
STING_MAX, STING_FADE = 4.0, 0.6
STING_MUSIC_DIP_DB = 4.0
STING_HP = 90


def place(bus, y, t):
    i = int(round(t * SR))
    if i >= len(bus) or i + len(y) <= 0:
        return
    if not np.all(np.isfinite(y)):
        print(f"  warning: non-finite samples in a layer at {t:.2f} s, zeroed")
        y = np.nan_to_num(y, nan=0.0, posinf=0.0, neginf=0.0)
    a, b = max(0, -i), min(len(y), len(bus) - i)
    bus[i + a:i + b] += y[a:b]


def speech_activity(voice):
    """0..1 per 5 ms hop: narrator speaking (held 120 ms past each syllable, 80 ms smoothing)."""
    hop = SR // 200  # 5 ms
    n = len(voice) // hop
    rms = np.sqrt(np.maximum(uniform_filter1d(voice[: n * hop] ** 2, hop)[::hop][:n], 0) + 1e-12)
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


def decode(path, start=0.0):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{start}", "-i", str(path), "-ac", "2", "-ar", str(SR),
                          "-f", "f32le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).astype(np.float64).reshape(-1, 2)


def peaking_sos(f0, db, q):
    """RBJ peaking EQ as one second-order section."""
    A, w = 10 ** (db / 40), 2 * np.pi * f0 / SR
    al = np.sin(w) / (2 * q)
    b = np.array([1 + al * A, -2 * np.cos(w), 1 - al * A])
    a = np.array([1 + al / A, -2 * np.cos(w), 1 - al / A])
    return np.concatenate([b / a[0], a / a[0]])[None, :]


def find_track(folder, name):
    key = lambda s: "".join(ch if ch.isalnum() else "_" for ch in s.lower()).strip("_")
    for p in sorted(folder.iterdir()):
        if p.suffix.lower() in (".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac") and key(p.stem) == key(name):
            return p
    return None


def scene_spans():
    js = (ROOT / "film/assets/data/words.js").read_text()
    data = json.loads(js[js.index("{"): js.rindex("}") + 1])
    return {s["id"]: (s["start"], s["end"]) for s in data["sections"]}


def k_weight(y):
    """ITU-R BS.1770 K-weighting (approximate): +4 dB high shelf from ~1.7 kHz, high-pass 38 Hz."""
    A, w = 10 ** (4 / 40), 2 * np.pi * 1681 / SR
    al = np.sin(w) / (2 * 0.707)
    c, r = np.cos(w), 2 * np.sqrt(A) * al
    b = np.array([A * ((A + 1) + (A - 1) * c + r), -2 * A * ((A - 1) + (A + 1) * c), A * ((A + 1) + (A - 1) * c - r)])
    a = np.array([(A + 1) - (A - 1) * c + r, 2 * ((A - 1) - (A + 1) * c), (A + 1) - (A - 1) * c - r])
    sos = np.vstack([np.concatenate([b / a[0], a / a[0]]), butter(2, 38, btype="high", fs=SR, output="sos")])
    return sosfilt(sos, y, axis=0)


def k_rms(y):
    return np.sqrt(np.mean(k_weight(y) ** 2)) + 1e-12


def music_plan(plan_path, voice, active, music_db):
    """One track per story phase, each levelled to music_db (in pauses: + MUSIC_DUCK_DB), crossfaded, ducked."""
    plan = json.loads(plan_path.read_text())
    spans = scene_spans()
    n_total = len(voice)
    xf = float(plan.get("xfade", 2.0))
    hp = butter(2, MUSIC_HP, btype="high", fs=SR, output="sos")
    eq = np.vstack([hp, peaking_sos(*MUSIC_DIP)])
    kv = k_rms(voice[active > 0.5])
    bus = np.zeros((n_total, 2))
    phases = plan["phases"]
    report = []
    for k, ph in enumerate(phases):
        s, e = spans[ph["from"]][0], spans[ph.get("to", ph["from"])][1]
        first, last = k == 0, k == len(phases) - 1
        a = 0.0 if first else s - xf / 2
        b = n_total / SR if last else e + xf / 2
        path = find_track(plan_path.parent, ph["file"])
        if path is None:
            print(f"  music: {ph['file']!r} not found in {plan_path.parent.name}/, phase {ph['from']}..{s:.1f}-{e:.1f} s silent")
            continue
        n = int(round((b - a) * SR))
        y = decode(path, ph.get("start", 0.0))
        y = y[:n] if len(y) >= n else loop_to(y, n, 0)
        y = sosfilt(eq, y, axis=0)
        y *= kv * 10 ** ((music_db + MUSIC_DUCK_DB + ph.get("db", 0)) / 20) / k_rms(y)
        env = np.ones(n)
        fi = int((MUSIC_FADE_IN if first else xf) * SR)
        fo = int((MUSIC_PLAN_FADE_OUT if last else xf) * SR)
        env[:fi] = np.sin(np.linspace(0, np.pi / 2, fi)) if not first else np.linspace(0, 1, fi)
        env[n - fo:] *= np.cos(np.linspace(0, np.pi / 2, fo)) if not last else np.linspace(1, 0, fo) ** 2
        place(bus, y * env[:, None], a)
        report.append((ph, path, s, e))
    bus *= duck_gain(voice, MUSIC_DUCK_DB, active)[:, None]
    for ph, path, s, e in report:
        i, j = int(s * SR), int(e * SR)
        sp = active[i:j] > 0.5
        rel = 20 * np.log10(k_rms(bus[i:j][sp]) / k_rms(voice[i:j][sp]))
        print(f"  music {ph['from']:>16}..{ph.get('to', ph['from']):<16} {s:6.1f}-{e:6.1f} s  {path.name}: {rel:+.1f} dB(K) vs voice under speech")
    return bus


_recs = {}


def recording(name, folder=AMB_DIR):
    """<folder>/<name>.mp3 as 48 kHz stereo float, band-limited to AMB_HP..AMB_LP."""
    key = str(folder / name)
    if key not in _recs:
        raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(folder / f"{name}.mp3"), "-ac", "2", "-ar", str(SR),
                              "-f", "f32le", "-"], capture_output=True, check=True).stdout
        y = np.frombuffer(raw, np.float32).astype(np.float64).reshape(-1, 2)
        sos = butter(2, AMB_HP, btype="high", fs=SR, output="sos")
        y = sosfilt(sos, y, axis=0)
        _recs[key] = sosfilt(butter(4, AMB_LP, btype="low", fs=SR, output="sos"), y, axis=0)
    return _recs[key]


def loop_to(y, n, start):
    """y from sample `start`, wrapped with an equal-power crossfade until it is n samples long."""
    k = int(AMB_LOOP_XFADE * SR)
    w = np.sin(np.linspace(0, np.pi / 2, k))[:, None]
    buf = y[start:]
    while len(buf) < n:
        buf = np.concatenate([buf[:-k], buf[-k:] * w[::-1] + y[:k] * w, y[k:]])
    return buf[:n]


def amb_bed(c, v_rms, seed):
    """Looped bed for [t, t + dur], widened by AMB_XFADE so neighbouring beds crossfade across the cut."""
    e = int(AMB_EDGE * SR)
    y = recording(c["file"])[e:-e]
    if c.get("lp"):
        y = sosfilt(butter(4, c["lp"], btype="low", fs=SR, output="sos"), y, axis=0)
    n = int(round((c["dur"] + AMB_XFADE) * SR))
    rng = np.random.default_rng(seed)
    y = loop_to(y, n, int(rng.random() * (len(y) // 2)))
    y *= v_rms * 10 ** ((AMB_DB + c.get("db", 0)) / 20) / (np.sqrt(np.mean(y ** 2)) + 1e-12)
    fi, fo = (int(max(c.get(k, 0), AMB_XFADE) * SR) for k in ("fi", "fo"))
    env = np.ones(n)
    env[:fi] = np.sin(np.linspace(0, np.pi / 2, fi))
    env[n - fo:] *= np.cos(np.linspace(0, np.pi / 2, fo))
    return y * env[:, None], c["t"] - AMB_XFADE / 2


def one_shot(c, v_rms):
    """A recording played once: leading silence trimmed, level from its active part, optional cut-off."""
    y = recording(c["file"])
    m = np.abs(y).max(1)
    on = int(np.argmax(m > m.max() * 10 ** (CLIP_ONSET_DB / 20)))
    y = y[max(0, on - int(0.01 * SR)):].copy()
    if c.get("dur"):
        y = y[: int(c["dur"] * SR)]
        fo = min(len(y), int(0.08 * SR))
        y[len(y) - fo:] *= np.linspace(1, 0, fo)[:, None]
    hop = SR // 20
    seg = np.sqrt(np.maximum(uniform_filter1d((y ** 2).mean(1), hop)[::hop], 0))
    act = seg[seg > seg.max() * 10 ** (-30 / 20)]
    act = act if len(act) else seg
    y *= v_rms * 10 ** (c.get("db", 0) / 20) / (np.sqrt(np.mean(act ** 2)) + 1e-12)
    pan = float(np.clip(c.get("x", 0.0), -1, 1)) * MAX_PAN
    return y * np.array([np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)]) * np.sqrt(2)


def sting_bus(plan_path, voice, active, v_rms):
    """Stingers on story beats -> (stereo bus, 0..1 presence envelope for the music dip)."""
    cues = json.loads(plan_path.read_text())["cues"]
    wp = ROOT / "data/words.json"
    lines = json.loads(wp.read_text())["lines"] if wp.exists() else []
    for c in cues:
        if "line" in c and c["line"] < len(lines):
            c["t"] = lines[c["line"]]["end"] + c.get("off", 0)
    bus = np.zeros((len(voice), 2))
    pres = np.zeros(len(voice))
    hp = butter(2, STING_HP, btype="high", fs=SR, output="sos")
    for c in cues:
        y = recording(c["file"], plan_path.parent)
        m = np.abs(y).max(1)
        on = int(np.argmax(m > m.max() * 10 ** (CLIP_ONSET_DB / 20)))
        y = sosfilt(hp, y[max(0, on - int(0.01 * SR)):], axis=0)
        n = min(len(y), int(c.get("dur", STING_MAX) * SR))
        y = y[:n].copy()
        fo = min(n, int(STING_FADE * SR))
        y[n - fo:] *= (np.cos(np.linspace(0, np.pi / 2, fo)) ** 2)[:, None]
        hop = SR // 20
        seg = np.sqrt(np.maximum(uniform_filter1d((y ** 2).mean(1), hop)[::hop], 0))
        act = seg[seg > seg.max() * 10 ** (-30 / 20)]
        act = act if len(act) else seg
        target = v_rms * 10 ** ((STING_DB + c.get("db", 0)) / 20)
        g = min(target / (np.sqrt(np.mean(act ** 2)) + 1e-12), target * 10 ** (STING_CREST / 20) / (np.abs(y).max() + 1e-12))
        t0 = c["t"] + c.get("gap", STING_GAP)
        i0 = int(t0 * SR)
        quiet = np.flatnonzero(active[i0:i0 + SR] < 0.5)
        if len(quiet):
            t0 += quiet[0] / SR
        place(bus, y * g, t0)
        i, j = int(t0 * SR), min(len(voice), int(t0 * SR) + n)
        pres[i:j] = 1.0
        print(f"  sting {t0:7.2f} s  {c['file']:<22} {n / SR:4.1f} s  {20 * np.log10(g * np.sqrt(np.mean(act ** 2)) / v_rms):+.1f} dB vs voice")
    soft = np.vstack([peaking_sos(*BUS_DIP), butter(2, BUS_LP, btype="low", fs=SR, output="sos")])
    bus = sosfilt(soft, bus, axis=0) * duck_gain(voice, STING_DUCK_DB, active)[:, None]
    k = int(0.25 * SR)
    pres = uniform_filter1d(maximum_filter1d(pres, k), k)
    return bus, pres


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
    ap.add_argument("--stings", default="")
    ap.add_argument("--light", default=None, type=lambda v: set(filter(None, v.split(","))))
    ap.add_argument("--loudness", type=float, default=TARGET_LUFS)
    a = ap.parse_args()

    voice, sr = sf.read(ROOT / "audio/out/voice_master.wav", always_2d=True)
    assert sr == SR
    voice = voice.mean(1)
    cues = json.loads(Path(a.cues).read_text())["cues"]

    active = speech_activity(voice)
    speech = voice[active > 0.5]
    v_rms = np.sqrt(np.mean(speech ** 2)) if len(speech) else np.sqrt(np.mean(voice ** 2))

    bus = np.zeros((len(voice), 2))
    amb = np.zeros((len(voice), 2))
    counts = {}
    for i, c in enumerate(cues):
        kind = c["kind"]
        if kind == "amb":
            y, t0 = amb_bed(c, v_rms, 7919 * i + 17)
            place(amb, y, t0)
            counts["amb:" + c["file"]] = counts.get("amb:" + c["file"], 0) + 1
            continue
        if kind == "clip":
            place(bus, one_shot(c, v_rms), c["t"])
            counts["clip:" + c["file"]] = counts.get("clip:" + c["file"], 0) + 1
            continue
        trim = 0.0
        if a.light is None:
            pass
        elif c.get("scene") not in a.light and kind not in ("amb", "clip"):
            if kind in COMIC_DROP:
                counts["drop:" + kind] = counts.get("drop:" + kind, 0) + 1
                continue
            if kind in COMIC_SOFT:
                kind = COMIC_SOFT[kind]
                trim -= 6
            trim += TENDER_TRIM.get(kind, 0)
        else:
            trim += LIGHT_TRIM.get(kind, 0)
        if samples(kind):
            counts.setdefault("~" + kind, 0)
            y = sample(kind, counts["~" + kind], c.get("dur") if kind not in ("pop", "tick", "stamp", "step", "coin") else None)
            counts["~" + kind] += 1
        elif kind in sfx.VOICES:
            y = sfx.render(kind, 7919 * i + 17, c.get("dur"))
        else:
            print(f"  skip unknown kind {kind!r} at {c['t']}")
            continue
        g = 10 ** ((LEVEL[kind] + a.sfx_db + trim) / 20) * float(c.get("gain", 1.0))
        pan = float(np.clip(c.get("x", 0.0), -1, 1)) * MAX_PAN
        lr = np.array([np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)]) * np.sqrt(2)
        if y.ndim == 1:
            y = y[:, None]
        elif y.shape[1] == 2:
            y = y.mean(axis=1, keepdims=True)
        place(bus, y * g * lr, c["t"])
        counts[kind] = counts.get(kind, 0) + 1

    soft = np.vstack([peaking_sos(*BUS_DIP), butter(2, BUS_LP, btype="low", fs=SR, output="sos")])
    bus = sosfilt(soft, bus, axis=0) * duck_gain(voice, DUCK_DB, active)[:, None]
    amb = sosfilt(soft, amb, axis=0) * duck_gain(voice, AMB_DUCK_DB, active)[:, None]
    mix = bus + amb + voice[:, None]
    pres = None
    if a.stings:
        stings, pres = sting_bus(ROOT / a.stings, voice, active, v_rms)
        mix += stings
        (ROOT / "out/ab").mkdir(parents=True, exist_ok=True)
        sf.write(ROOT / "out/ab/sting_only.wav", stings, SR, subtype="PCM_24")
    (ROOT / "out/ab").mkdir(parents=True, exist_ok=True)
    sf.write(ROOT / "out/ab/sfx_only.wav", bus, SR, subtype="PCM_24")
    sf.write(ROOT / "out/ab/amb_only.wav", amb, SR, subtype="PCM_24")
    if a.music:
        if a.music.endswith(".json"):
            music = music_plan(ROOT / a.music, voice, active, a.music_db)
        else:
            music = music_bed(ROOT / a.music, voice, active, a.music_db, a.music_start)
        if pres is not None:
            music = music * (10 ** (-STING_MUSIC_DIP_DB * pres / 20))[:, None]
        mix += music
        sf.write(ROOT / "out/ab/music_only.wav", music, SR, subtype="PCM_24")
        sp = active > 0.5
        rel = 20 * np.log10(np.sqrt(np.mean(music[sp] ** 2)) / np.sqrt(np.mean(voice[sp] ** 2)))
        print(f"music {Path(a.music).name}: {rel:+.1f} dB vs voice under speech")

    # loudness: measure, apply one static gain, then a true-peak-aware limiter (oversampled) in ffmpeg
    with tempfile.TemporaryDirectory() as d:
        raw = Path(d) / "raw.wav"
        assert np.all(np.isfinite(mix)), "mix has NaN/inf samples"
        sf.write(raw, mix, SR, subtype="FLOAT")
        I, _ = ffmpeg_loudness(raw)
        gain = a.loudness - I
        out = Path(a.out)
        lim = 10 ** ((TP_LIMIT - 0.3) / 20)
        subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(raw), "-af",
                        f"volume={gain:.2f}dB,aresample=192000,alimiter=limit={lim:.4f}:attack=1:release=60:"
                        f"level=disabled,aresample=48000", "-c:a", "pcm_s24le", str(out)], check=True)
    I, TP = ffmpeg_loudness(out)
    print("cues: " + ", ".join(f"{k} {v}" for k, v in sorted(counts.items()) if k[0] != "~"))
    print(f"wrote {out.name}  I {I:.1f} LUFS  TP {TP:.1f} dBTP  ({len(mix) / SR:.2f} s)")


if __name__ == "__main__":
    main()
