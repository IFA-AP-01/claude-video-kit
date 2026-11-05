"""Targeted declick for TTS vocoder clicks: short broadband impulses at word onsets and offsets
(Gemini TTS: about 80 per minute). Only the band above 3 kHz is dipped, for 8 ms around each
detected click; everything else stays bit-identical. Runs after defry, before the master.
ffmpeg's adeclick works on the whole signal and smeared the voice.

  .venv/bin/python declick.py <in> <out.wav>

Click = the 3-6, 6-9 and 9-12 kHz bands all jump > 10 dB over their 30 ms local median in the
same 2 ms frame. Repair: linear-phase split at 3 kHz, high band x 0.15 over +-4 ms, 2 ms ramps.
"""

import argparse

import librosa
import numpy as np
import soundfile as sf
from scipy.ndimage import median_filter
from scipy.signal import filtfilt, firwin

HOP = 48
BANDS = [(3000, 6000), (6000, 9000), (9000, 12000)]


def find_clicks(y, sr):
    hop = max(1, int(round(HOP * sr / 24000)))
    n_fft = 256 * max(1, int(round(sr / 24000)))
    S = np.abs(librosa.stft(y, n_fft=n_fft, hop_length=hop)) ** 2
    f = librosa.fft_frequencies(sr=sr, n_fft=n_fft)
    jumps = []
    for a, b in BANDS:
        e = 10 * np.log10(S[(f >= a) & (f < b)].sum(0) + 1e-12)
        jumps.append(e - median_filter(e, 15))
    idx = np.nonzero(np.min(jumps, axis=0) > 10)[0]
    if not len(idx):
        return np.array([], int)
    return idx[np.insert(np.diff(idx) > 5, 0, True)] * hop


def repair(y, sr, clicks, floor=0.15):
    lo = filtfilt(firwin(255 * max(1, int(round(sr / 24000))), 3000, fs=sr), [1], y)
    hi = y - lo
    g = np.ones_like(y)
    w, r = int(0.004 * sr), int(0.002 * sr)
    for c in clicks:
        a, b = max(c - w, 0), min(c + w, len(y))
        g[a:b] = np.minimum(g[a:b], floor)
        for k in range(r):
            v = floor + (1 - floor) * (1 - k / r)
            if a - r + k >= 0:
                g[a - r + k] = min(g[a - r + k], v)
            if b + r - 1 - k < len(y):
                g[b + r - 1 - k] = min(g[b + r - 1 - k], v)
    return lo + hi * g


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("inp")
    ap.add_argument("out")
    a = ap.parse_args()
    y, sr = sf.read(a.inp)
    if y.ndim > 1:
        y = y.mean(1)
    clicks = find_clicks(y, sr)
    out = repair(y, sr, clicks)
    peak = np.max(np.abs(out))
    if peak > 0.999:
        out *= 0.999 / peak
    sf.write(a.out, out, sr, subtype="PCM_24")
    print(f"declick: {len(clicks)} clicks ({len(clicks) / (len(y) / sr / 60):.0f}/min) repaired above 3 kHz")


if __name__ == "__main__":
    main()
