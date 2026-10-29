"""Demucs source separation -> stems/{vocals,drums,bass,other}.wav.

Also measures the time offset between the stems and the decoded song.mp3
(cross-correlation of the stem sum against the mix) so later stages can work
in song time.
"""
import shutil
import subprocess
import sys

import numpy as np
from scipy.signal import correlate

from common import CONFIG, SONG, STEMS, WORK, OFFSET_FILE, device, load_mono, write_json

MODEL = CONFIG["demucs_model"]


def run_demucs():
    if all((STEMS / f"{s}.wav").exists() for s in ("vocals", "drums", "bass", "other")):
        print("stems cached")
        return
    out = WORK / "demucs"
    subprocess.run([sys.executable, "-m", "demucs", "-n", MODEL, "-d", device(),
                    "-o", str(out), str(SONG)], check=True)
    src = out / MODEL / SONG.stem
    for s in ("vocals", "drums", "bass", "other"):
        shutil.copy(src / f"{s}.wav", STEMS / f"{s}.wav")


def measure_offset():
    sr = 8000
    mix = load_mono(SONG, sr)
    stems = sum(load_mono(STEMS / f"{s}.wav", sr) for s in ("vocals", "drums", "bass", "other"))
    n = min(len(mix), len(stems), sr * 60)
    a, b = mix[sr * 10:n], stems[sr * 10:n]
    c = correlate(b, a, mode="full", method="fft")
    lag = np.argmax(c) - (len(a) - 1)
    off = lag / sr
    print(f"stem offset vs mix: {off*1000:.1f} ms")
    write_json(OFFSET_FILE, {"offset": off})


if __name__ == "__main__":
    run_demucs()
    measure_offset()
