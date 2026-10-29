"""Beat grid, downbeats, sections, envelopes and onsets -> data/audio.json.

- Tempo comes from the audio (librosa on the drum stem), then a constant-tempo grid is
  least-squares fitted to the detected beats (Suno tracks hold a steady tempo).
- Downbeat phase (0..3) maximises low-band (kick/bass) energy and agreement with the
  first sung word of each lyric section.
- Sections come from the lyric tags (data/lyrics.json): each starts on the downbeat at or
  just before its first word (pickups up to 1 beat early are absorbed). Gaps become
  `intro`, `inst*` and `end`. librosa novelty boundaries are kept for the QA report.
"""
import json

import librosa
import numpy as np

from common import CONFIG, DATA, SONG, WORK, load_mono, load_stem, round3, write_json

SR = 22050
FPS = 100   # envelope rate in audio.json
HOP = 220   # ~SR/FPS (librosa needs an int hop); envelopes are resampled to FPS anyway
BPB = int(CONFIG["beats_per_bar"])


def env(y, hop=HOP):
    r = librosa.feature.rms(y=y, frame_length=2048, hop_length=hop)[0]
    return r


def resample_to_fps(x, src_rate, n):
    t_src = np.arange(len(x)) / src_rate
    t = np.arange(n) / FPS
    return np.interp(t, t_src, x)


def norm(x):
    p = np.percentile(x, 99.5)
    return np.clip(x / (p + 1e-9), 0, 1.5)


def fit_grid(beats, duration):
    """Fit t = t0 + k*period to detected beats (integer k from rounding), iterate."""
    period = np.median(np.diff(beats))
    t0 = beats[0]
    for _ in range(5):
        k = np.round((beats - t0) / period)
        A = np.vstack([np.ones_like(k), k]).T
        (t0, period), *_ = np.linalg.lstsq(A, beats, rcond=None)
        resid = beats - (t0 + k * period)
        keep = np.abs(resid) < 0.06
        beats = beats[keep]
    while t0 - period > 0:
        t0 -= period
    grid = np.arange(t0, duration, period)
    return grid, period, float(np.std(resid[np.abs(resid) < 0.06]))


def onset_list(y, sr, hop, fmin=None, fmax=None, delta=0.08):
    S = np.abs(librosa.stft(y, n_fft=2048, hop_length=hop))
    freqs = librosa.fft_frequencies(sr=sr, n_fft=2048)
    band = np.ones_like(freqs, bool)
    if fmin:
        band &= freqs >= fmin
    if fmax:
        band &= freqs <= fmax
    o = librosa.onset.onset_strength(S=librosa.amplitude_to_db(S[band]), sr=sr, hop_length=hop)
    o = o / (o.max() + 1e-9)
    fr = librosa.onset.onset_detect(onset_envelope=o, sr=sr, hop_length=hop, delta=delta,
                                    backtrack=False, units="frames")
    return [[round3(f * hop / sr), round3(o[f])] for f in fr]


def main():
    mix = load_mono(SONG, SR)
    duration = len(mix) / SR
    drums = load_stem("drums", SR)
    bass = load_stem("bass", SR)
    voc = load_stem("vocals", SR)
    other = load_stem("other", SR)
    lyr = json.loads((DATA / "lyrics.json").read_text())

    # --- tempo & grid -------------------------------------------------------------------
    oenv = librosa.onset.onset_strength(y=drums + 0.5 * bass, sr=SR, hop_length=512)
    tempo, bf = librosa.beat.beat_track(onset_envelope=oenv, sr=SR, hop_length=512,
                                        units="frames", tightness=400)
    beats_raw = librosa.frames_to_time(bf, sr=SR, hop_length=512)
    grid, period, jitter = fit_grid(beats_raw, duration)
    bpm = 60.0 / period

    # --- downbeat phase -------------------------------------------------------------------
    # Harmony changes on the downbeat (chroma flux between beats peaks there) and the
    # backbeat snare sits on beats 2 and 4 (so it is weak on the downbeat).
    hop = 512
    chroma = librosa.feature.chroma_cqt(y=other + bass, sr=SR, hop_length=hop)
    bfr = librosa.time_to_frames(grid, sr=SR, hop_length=hop)
    bfr = bfr[bfr < chroma.shape[1] - 1]
    span = max(1, int(period * SR / hop))
    cb = np.stack([chroma[:, f:f + span].mean(1) for f in bfr], 1)
    flux = np.r_[0, np.linalg.norm(np.diff(cb, axis=1), axis=0)]
    S = np.abs(librosa.stft(drums, hop_length=hop))
    fr = librosa.fft_frequencies(sr=SR)
    snare_e = S[(fr > 1500) & (fr < 5000)].sum(0)
    sn = np.array([snare_e[f:f + 3].max() for f in bfr])
    scores = []
    for ph in range(BPB):
        m = np.arange(len(bfr)) % BPB == ph
        cf, sv = flux[m].mean() / flux.mean(), sn[m].mean() / sn.mean()
        scores.append((float(cf - (sv - 1.0)), ph, float(cf), float(sv)))
    scores.sort(reverse=True)
    phase = scores[0][1]
    downbeats = grid[phase::BPB]

    # --- sections ---------------------------------------------------------------------------
    # Pop sections start on 4-bar phrase boundaries. Pick the phrase offset (downbeat index
    # mod 4) that catches the most lyric sections, allowing sung pickups of up to 2.5 beats
    # before the boundary. Sections that do not fit (e.g. a free spoken outro) fall back to
    # the downbeat at/before the first word (+1 beat pickup).
    bar = BPB * period
    first = [s["start"] for s in lyr["sections"]]

    def fits(t, b):
        return b - 2.5 * period <= t <= b + bar

    def phrase_bounds(off):
        return downbeats[off::4]

    best = max(range(4), key=lambda off: sum(any(fits(t, b) for b in phrase_bounds(off)) for t in first))
    phrases = phrase_bounds(best)

    def snap(t):
        c = [b for b in phrases if fits(t, b)]
        if c:
            return float(min(c, key=lambda b: abs(b - t))), True
        c = downbeats[downbeats <= t + period + 1e-6]
        return (float(c[-1]) if len(c) else 0.0), False

    secs = []
    for s in lyr["sections"]:
        st, on_phrase = snap(s["start"])
        secs.append({"name": s["name"], "start": st, "phrase": on_phrase, "sung": s["start"],
                     "last_word": s["end"]})
    secs[0]["start"] = 0.0 if secs[0]["start"] < 2 * bar else secs[0]["start"]
    out_secs = []
    if secs[0]["start"] > 0.5:
        names = {s["name"] for s in secs}
        out_secs.append({"name": "intro" if "intro" not in names else "count_in", "start": 0.0})
    for i, s in enumerate(secs):
        if i > 0:
            # instrumental phrase between the previous section's last word and this one
            gap = phrases[(phrases > secs[i - 1]["last_word"]) & (phrases < s["start"] - 1e-6)]
            if len(gap):
                out_secs.append({"name": f"{secs[i - 1]['name']}_post", "start": float(gap[0])})
        out_secs.append({"name": s["name"], "start": s["start"]})
    last_end = secs[-1]["last_word"]
    end_db = downbeats[downbeats > last_end + period]
    if len(end_db) and duration - last_end > 2.0:
        out_secs.append({"name": "end", "start": float(end_db[0])})
    for i, s in enumerate(out_secs):
        s["end"] = out_secs[i + 1]["start"] if i + 1 < len(out_secs) else duration
        s["start"], s["end"] = round3(s["start"]), round3(s["end"])

    # --- novelty boundaries (QA only) ------------------------------------------------------
    chroma = librosa.feature.chroma_cqt(y=other + bass, sr=SR, hop_length=2048)
    mfcc = librosa.feature.mfcc(y=mix, sr=SR, hop_length=2048, n_mfcc=13)
    feat = np.vstack([librosa.util.normalize(chroma, axis=0), librosa.util.normalize(mfcc, axis=1)])
    bounds = librosa.segment.agglomerative(feat, k=len(out_secs))
    novelty = [round3(t) for t in librosa.frames_to_time(bounds, sr=SR, hop_length=2048)]

    # --- envelopes @100fps ------------------------------------------------------------------
    n = int(np.ceil(duration * FPS))
    S = np.abs(librosa.stft(mix, n_fft=2048, hop_length=HOP))
    freqs = librosa.fft_frequencies(sr=SR, n_fft=2048)

    def band(lo, hi):
        e = np.sqrt((S[(freqs >= lo) & (freqs < hi)] ** 2).mean(axis=0))
        return e

    rate = SR / HOP
    envs = {
        "rms": env(mix), "low": band(20, 180), "mid": band(180, 2500), "high": band(2500, 11000),
        "vocal": env(voc), "drums": env(drums), "bass": env(bass),
    }
    envs = {k: [round(float(x), 3) for x in norm(resample_to_fps(v, rate, n))] for k, v in envs.items()}

    onsets = {
        "kick": onset_list(drums, SR, HOP, fmax=150, delta=0.15),
        "snare": onset_list(drums, SR, HOP, fmin=1500, fmax=6000, delta=0.15),
        "vocal": onset_list(voc, SR, HOP, delta=0.1),
    }

    out = {
        "duration": round3(duration), "bpm": round(bpm, 3), "beat_period": round(period, 5),
        "time_signature": BPB, "grid_jitter": round(jitter, 4), "downbeat_phase": phase,
        "beats": [round3(t) for t in grid], "downbeats": [round3(t) for t in downbeats],
        "sections": out_secs, "fps": FPS, "env": envs, "onsets": onsets,
        "notes": "times in song.mp3 seconds; env normalised to ~[0,1] (99.5th pct)",
    }
    write_json(DATA / "audio.json", out)
    (WORK / "analyze_debug.json").write_text(json.dumps({
        "librosa_tempo": float(np.atleast_1d(tempo)[0]), "phase_scores": scores, "novelty": novelty,
        "sections_sung": secs, "phrase_offset": best}, indent=1, default=float))
    print(f"bpm {bpm:.3f} (librosa {float(np.atleast_1d(tempo)[0]):.1f}), jitter {jitter*1000:.1f} ms, "
          f"phase {phase}, {len(grid)} beats, {len(out_secs)} sections")


if __name__ == "__main__":
    main()
