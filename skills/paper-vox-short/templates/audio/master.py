"""Warm studio master for the narration (replaces the bright master.sh chain).

  .venv/bin/python master.py <in> <out.wav> [--warmth 0|1|2] [--loudness -14]

1. resample 48 kHz
2. static tonal EQ: min-phase FIR that moves the long-term spectrum toward a warm broadcast
   voice curve (cuts only above 1 kHz, gentle roll-off above ~12 kHz)
3. dynamic de-harsh (soothe-like): STFT, per frame attenuate narrow peaks that stick out of the
   smoothed spectral envelope in 2-10 kHz (TTS/MP3 resonances at ~4.5-4.8 k and ~7.5-8 k)
4. de-ess: per frame, if 5-10 kHz is too loud vs 300-3000 Hz, duck that band\n   + presence tamer: same for 2-5 kHz spikes (fricatives) — the main source of harshness here
5. ffmpeg: gentle compressor + 2-pass loudnorm, 48 kHz / 24-bit, 0.25 s head pad
6. post-dynamics tonal EQ pass (compression brightens the long-term spectrum), static gain + TP limiter
"""

import argparse
import json
import subprocess
import tempfile
from pathlib import Path

import librosa
import numpy as np
import soundfile as sf
from scipy.ndimage import gaussian_filter1d, uniform_filter1d
from scipy.signal import firwin2, minimum_phase, fftconvolve

SR = 48000

# warm broadcast voice, long-term spectrum in dB relative to 800-1200 Hz
TARGET = {
    -1: [(1000, 0), (2000, -5), (3150, -9), (4000, -11), (5000, -12.5), (6300, -14.5), (8000, -17),
         (10000, -20), (12500, -25), (16000, -33), (24000, -55)],
    0: [(1000, 0), (2000, -6), (2800, -10), (3550, -13.5), (4500, -17), (5600, -20), (7100, -23),
        (9000, -27), (12000, -33), (16000, -42), (24000, -60)],
    1: [(1000, 0), (2000, -6.5), (2800, -11), (3550, -15), (4500, -19), (5600, -22), (7100, -25),
        (9000, -29), (12000, -36), (16000, -46), (24000, -65)],
    2: [(1000, 0), (2000, -7), (2800, -12), (3550, -16.5), (4500, -21), (5600, -24), (7100, -27),
        (9000, -31), (12000, -39), (16000, -50), (24000, -70)],
}

# speech LTASS below 1 kHz, same units; the voice is only cut down to it (removes boom/mud);
# 100-250 Hz sits ~3 dB under the textbook LTASS: a deep male TTS read as boomy at the full level
LOW_TARGET = [(60, 2), (100, 8), (150, 9.5), (250, 10.5), (400, 11), (700, 6), (1000, 0)]


def ltas(y, n_fft=4096):
    S = np.abs(librosa.stft(y, n_fft=n_fft, hop_length=1024)) ** 2
    e = S.sum(0)
    S = S[:, e > np.percentile(e, 40)]
    f = librosa.fft_frequencies(sr=SR, n_fft=n_fft)
    return f, 10 * np.log10(S.mean(1) + 1e-20)


def tonal_eq(y, warmth):
    f, d = ltas(y)
    d = gaussian_filter1d(d, 6)  # smooth (~70 Hz at 4096) — broad strokes only
    ref = d[(f > 800) & (f < 1200)].mean()
    tf, tg = zip(*TARGET[warmth])
    target = np.interp(f, tf, tg)
    corr = np.clip(target - (d - ref), -12, 0)  # cut only: never brighten
    lf, lg = zip(*LOW_TARGET)
    _, raw = ltas(y)
    lg2 = np.log2(np.maximum(f, 20))
    grid = np.linspace(lg2[1], lg2[-1], 2048)
    third = uniform_filter1d(10 * np.log10(np.interp(grid, lg2, 10 ** (raw / 10))), 2048 // 33)
    d_low = np.interp(lg2, grid, third)
    low = np.clip(np.interp(f, lf, lg) - (d_low - ref), -9, 0)
    corr = np.where(f >= 1000, corr, np.where(f >= 60, low, 0))
    # smooth the correction over ~1/3 octave so it is a gentle curve, not a comb
    logf = np.log2(np.maximum(f, 20))
    grid = np.linspace(logf[1], logf[-1], 2048)
    cg = np.interp(grid, logf, corr)
    cg = uniform_filter1d(cg, 2048 // 30)
    corr = np.interp(logf, grid, cg)
    corr[f < 50] = 0
    gains = 10 ** (corr / 10)  # squared: homomorphic minimum_phase returns ~sqrt of this magnitude
    fir = firwin2(4097, f / (SR / 2), gains)
    fir = minimum_phase(fir, method="homomorphic")
    out = fftconvolve(y, fir)[: len(y)]
    return out, f, corr


def smooth_tf(g, t_frames_attack, t_frames_release):
    """1-pole attack/release smoothing of a gain-reduction matrix (dB, <=0) along time."""
    out = np.empty_like(g)
    prev = np.zeros(g.shape[0])
    a_att = np.exp(-1.0 / max(t_frames_attack, 1e-3))
    a_rel = np.exp(-1.0 / max(t_frames_release, 1e-3))
    for i in range(g.shape[1]):
        x = g[:, i]
        a = np.where(x < prev, a_att, a_rel)  # more reduction -> attack
        prev = a * prev + (1 - a) * x
        out[:, i] = prev
    return out


def deharsh(y, depth=0.3, max_cut=3.0, ess_thresh=None, ess_ratio=0.5, ess_max=4.0,
            pres_thresh=None, pres_ratio=0.5, pres_max=6.0):
    n_fft, hop = 2048, 256
    D = librosa.stft(y, n_fft=n_fft, hop_length=hop)
    mag = np.abs(D) + 1e-12
    f = librosa.fft_frequencies(sr=SR, n_fft=n_fft)
    db = 20 * np.log10(mag)

    # (a) resonance taming: local peak vs. wide envelope along frequency
    fine = gaussian_filter1d(db, 1.0, axis=0)
    env = gaussian_filter1d(db, 14.0, axis=0)  # ~330 Hz sigma
    excess = np.maximum(fine - env - 6.0, 0)  # only peaks > 6 dB above envelope
    band = ((f >= 2000) & (f <= 10000)).astype(float)
    band = gaussian_filter1d(band, 6)  # soft band edges
    gr = -np.minimum(excess * depth, max_cut) * band[:, None]

    # (b) de-ess: 5-10 kHz energy relative to 300-3000 Hz
    p = mag**2
    hi = p[(f >= 5000) & (f <= 10000)].sum(0)
    body = p[(f >= 300) & (f <= 3000)].sum(0) + 1e-12
    rel = 10 * np.log10(hi / body + 1e-12)
    if ess_thresh is None:
        ess_thresh = max(float(np.median(rel[body > np.percentile(body, 40)])) + 20.0, 10.0)
    ess = -np.minimum(np.maximum(rel - ess_thresh, 0) * ess_ratio, ess_max)
    ess_band = gaussian_filter1d(((f >= 4500) & (f <= 12000)).astype(float), 8)
    gr = gr + ess[None, :] * ess_band[:, None]

    # (c) presence spikes: fricatives/plosives where 2-5 kHz jumps up to the level of the voice body
    #     (median frame is ~-16.5 dB, harsh frames reach -6 dB and above)
    pres = p[(f >= 2000) & (f <= 5000)].sum(0)
    relp = 10 * np.log10(pres / body + 1e-12)
    if pres_thresh is None:
        pres_thresh = float(np.median(relp[body > np.percentile(body, 40)])) + 20.0
    pg = -np.minimum(np.maximum(relp - pres_thresh, 0) * pres_ratio, pres_max)
    pres_band = gaussian_filter1d(((f >= 1800) & (f <= 6000)).astype(float), 8)
    gr = gr + pg[None, :] * pres_band[:, None]

    fps = SR / hop
    gr = smooth_tf(gr, 0.003 * fps, 0.060 * fps)  # 3 ms attack, 60 ms release
    gr = gaussian_filter1d(gr, 1.5, axis=0)  # no single-bin notches (avoids "phasey" sound)
    out = librosa.istft(D * 10 ** (gr / 20), hop_length=hop, length=len(y))
    stats = dict(res_avg_cut=float(-gr[(f >= 2000) & (f <= 10000)].mean()),
                 ess_frames=float((ess < -1).mean()), pres_frames=float((pg < -1).mean()))
    return out, stats


def _loudnorm_measure(src, chain, ln):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", src, "-af", f"{chain},{ln}:print_format=json",
                        "-f", "null", "-"], capture_output=True, text=True)
    txt = r.stderr
    return json.loads(txt[txt.rindex("{"): txt.rindex("}") + 1])


def ffmpeg_finish(src, dst, loudness):
    pre = ("adelay=250:all=1,apad=pad_dur=0.5,highpass=f=80:poles=2,lowshelf=f=170:g=-2.5:t=q:w=0.7,"
           "acompressor=threshold=-22dB:ratio=2:attack=15:release=150:knee=6:makeup=1.5")
    ln = f"loudnorm=I={loudness}:TP=-1.0:LRA=7"
    m = _loudnorm_measure(src, pre, ln)
    gain = loudness + 0.3 - float(m["input_i"])
    pre += (f",volume={gain:.2f}dB,aresample=192000,"
            "alimiter=limit=0.79:attack=1:release=40:level=false:asc=1,aresample=48000")
    m = _loudnorm_measure(src, pre, ln)
    ln2 = (f"{ln}:linear=true:measured_I={m['input_i']}:measured_TP={m['input_tp']}:"
           f"measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}")
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", src, "-af",
                    f"{pre},{ln2},aresample=48000", "-ac", "1", "-ar", "48000", "-c:a", "pcm_s24le", dst],
                   check=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("dst")
    ap.add_argument("--warmth", type=int, default=1, choices=[-1, 0, 1, 2])
    ap.add_argument("--loudness", type=float, default=-14.0)
    ap.add_argument("--pres-thresh", type=float, default=None, help="2-5 kHz spike threshold vs voice body (dB); default voiced median + 12")
    a = ap.parse_args()

    y, _ = librosa.load(a.src, sr=SR, mono=True, res_type="soxr_vhq")
    y, f, corr = tonal_eq(y, a.warmth)
    y, _, corr2 = tonal_eq(y, a.warmth)  # second pass: the low cut lowers the 1 kHz reference, so re-measure
    corr = corr + corr2
    pts = [100, 200, 400, 2000, 3000, 4500, 6000, 8000, 12000]
    print("  static EQ cut:", ", ".join(f"{str(p // 1000) + 'k' if p >= 1000 else p} {np.interp(p, f, corr):+.1f}dB" for p in pts))
    y, st = deharsh(y, pres_thresh=a.pres_thresh)
    print(f"  de-harsh avg cut 2-10k {st['res_avg_cut']:.1f} dB, de-ess {st['ess_frames'] * 100:.0f}% frames, "
          f"presence tamer {st['pres_frames'] * 100:.0f}% frames")
    with tempfile.TemporaryDirectory() as td:
        tmp = str(Path(td) / "pre.wav")
        sf.write(tmp, y.astype(np.float32), SR, subtype="FLOAT")
        mid = str(Path(td) / "mid.wav")
        ffmpeg_finish(tmp, mid, a.loudness)
        # compression lifts quiet consonants against vowels (2-9 kHz rose ~5 dB): match the target after it
        z, _ = sf.read(mid)
        corr3 = 0
        for _ in range(3):  # each pass moves the 1 kHz reference a little, so converge
            z, _, c = tonal_eq(z, a.warmth)
            corr3 = corr3 + c
        print("  post-dynamics EQ cut:", ", ".join(f"{str(p // 1000) + 'k' if p >= 1000 else p} {np.interp(p, f, corr3):+.1f}dB" for p in pts))
        post = str(Path(td) / "post.wav")
        sf.write(post, z.astype(np.float32), SR, subtype="FLOAT")
        m = _loudnorm_measure(post, "anull", f"loudnorm=I={a.loudness}:TP=-1.0:LRA=7")
        subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", post, "-af",
                        f"volume={a.loudness - float(m['input_i']):.2f}dB,aresample=192000,"
                        "alimiter=limit=0.84:attack=1:release=40:level=false:asc=1,aresample=48000",
                        "-ac", "1", "-ar", "48000", "-c:a", "pcm_s24le", a.dst], check=True)


if __name__ == "__main__":
    main()
