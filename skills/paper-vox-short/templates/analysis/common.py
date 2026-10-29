"""Shared paths, config and audio helpers for the narration alignment (adapted from skills/lyric-beat-analysis).

Paper Vox Short: song = audio/out/voice_master.wav, lyrics = analysis/lines.txt (written by
make_lines.py from script.txt), stems/vocals.wav is a symlink to the master (clean voice, no
separation; make.sh creates it), device forced to cpu in config.json.

Layout (project root = parent of this `analysis/` folder):
    song.mp3            the master mix (all times are seconds in this file)
    lyrics.txt          lyric sheet with [Section] tags
    data/               outputs: lyrics.json, audio.json, qa_report.md, lyrics.fix.json
    analysis/config.json  optional overrides (see DEFAULTS)
    analysis/stems, analysis/work   caches (do not commit)
"""
from pathlib import Path
import json

import numpy as np

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent

DEFAULTS = {
    "song": "song.mp3",
    "lyrics": "lyrics.txt",
    "language": "en",            # whisper language; null = auto-detect
    "whisper_prompt": "",        # vocabulary hint (product names, slang) for whisper
    "whisper_model": "",         # "" = large-v3-turbo for the available backend
    "demucs_model": "htdemucs_ft",
    "device": "",                # "" = auto (mps / cuda / cpu)
    "spoken": {},                # display word -> how it is sung, e.g. {"ai": "a i", "3": "three"}
    "sections": {},              # lyric tag -> section id, e.g. {"Hook": "chorus"}
    "beats_per_bar": 4,
}
_cfg_path = HERE / "config.json"
CONFIG = {**DEFAULTS, **(json.loads(_cfg_path.read_text()) if _cfg_path.exists() else {})}

SONG = ROOT / CONFIG["song"]
LYRICS_TXT = ROOT / CONFIG["lyrics"]
DATA = ROOT / "data"
STEMS = HERE / "stems"
WORK = HERE / "work"
for d in (DATA, STEMS, WORK):
    d.mkdir(parents=True, exist_ok=True)

OFFSET_FILE = WORK / "stem_offset.json"


def device():
    if CONFIG["device"]:
        return CONFIG["device"]
    import torch
    if torch.backends.mps.is_available():
        return "mps"
    return "cuda" if torch.cuda.is_available() else "cpu"


def load_mono(path, sr):
    """Load audio as mono float32 at `sr`."""
    import librosa
    y, _ = librosa.load(str(path), sr=sr, mono=True)
    return y.astype(np.float32)


def load_stem(name, sr):
    """Load a stem resampled to `sr`, shifted so it lines up with song.mp3 time."""
    y = load_mono(STEMS / f"{name}.wav", sr)
    off = stem_offset()
    n = int(round(off * sr))
    if n > 0:  # stem is late -> drop leading samples
        y = y[n:]
    elif n < 0:
        y = np.concatenate([np.zeros(-n, np.float32), y])
    return y


def stem_offset():
    if OFFSET_FILE.exists():
        return json.loads(OFFSET_FILE.read_text())["offset"]
    return 0.0


def write_json(path, obj):
    path.write_text(json.dumps(obj, ensure_ascii=False, separators=(",", ":")))


def round3(x):
    return float(round(float(x), 3))
