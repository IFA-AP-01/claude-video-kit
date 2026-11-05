"""Vocal-fry repair: finds creaky voice (the burp-like, froggy rattle at phrase ends of English
reads) and re-voices it as smooth, periodic speech. Runs on the raw voice, before master.py.

  .venv/bin/python defry.py <in> <out.wav> [--strength 1] [--report data/defry.json] [--ab out/ab]

1. Praat analysis on a 5 ms grid: modal pitch (ac, floor 60 Hz), low-floor pitch (cc, floor
   30 Hz), glottal pulses (period jitter), intensity.
2. Fry frame = speech-level intensity, voiced (energy under 1 kHz > 6 dB over 3 kHz+, so an
   "s", breath or burst is never resynthesised) and one of (--reach wide, the default; normal
   in brackets)
   - the low-floor F0 is under 0.78 (0.62) x the speaker's modal median and the modal tracker
     agrees the voice is low or unvoiced (an octave-down tracker error is not fry),
   - the modal tracker is unvoiced while the low tracker finds pulses under 0.85 (0.75) x median,
   - period jitter is over 2.5 (4) % with F0 under 0.92 (0.85) x median.
3. Regions: gaps < 30 ms closed, regions >= 25 ms kept, 15 ms + 20 ms padding.
4. Repair: Praat's Manipulation overlap-add, with the pitch tier replaced only inside the regions
   by a smooth contour joined to the modal F0 around it (at a phrase end: the last modal value with
   a gentle 8 % fall), floored at the speaker's 25th (10th) percentile. Inside each region the
   glottal pulses are refilled at <= 12.5 ms spacing, because Praat copies pulse gaps over 20 ms
   unchanged. Hann-smoothed 15 ms crossfades; everything outside the regions stays bit-identical.
   (A hand-written pulse-train PSOLA smeared the formants: "burbling, broken".)
   --strength (0-1) scales how far the pitch moves toward that contour.
5. Deep creak under 60 Hz (the tail of a phrase-final word) cannot be re-pitched cleanly: it is
   turned down 14 dB with 20 ms ramps so the word ends cleanly.
Targeting (--words): fry is only searched where a read creaks, the tail of a phrase-final word
(followed by punctuation, a gap >= 0.2 s, or the end): its last 55 % plus 80 ms after it, never
into the next word. Everything else stays bit-identical, deep-tail softening included. The
repaired words are listed in the report. Without --words the whole file is searched (old mode,
which also hit ordinary low notes and chopped mid-word octave errors).
6. Re-detects on the output and prints the fry share before -> after; --ab writes
   defry_before.wav / defry_after.wav with the worst regions in context for a listen-check.
"""

import argparse
import json
from pathlib import Path

import numpy as np
import parselmouth
import soundfile as sf
from parselmouth.praat import call

HOP = 0.005
TAIL_DB = -14.0
REACH = {"normal": dict(low=0.62, gap=0.75, jit=0.04, rough=0.85, floor=10),
         "wide": dict(low=0.78, gap=0.85, jit=0.025, rough=0.92, floor=25)}
R = REACH["normal"]


def track(obj, t):
    """Sample a Praat pitch/intensity object on grid t (nearest frame, 0 where undefined)."""
    xs = np.asarray(obj.xs())
    v = obj.selected_array["frequency"] if isinstance(obj, parselmouth.Pitch) else obj.values[0]
    v = np.nan_to_num(np.asarray(v, float))
    i = np.clip(np.round((t - xs[0]) / (xs[1] - xs[0])).astype(int), 0, len(xs) - 1)
    out = v[i]
    out[(t < xs[0] - HOP) | (t > xs[-1] + HOP)] = 0
    return out


def analyse(snd):
    t = np.arange(0, snd.duration, HOP)
    p_md = snd.to_pitch_ac(time_step=HOP, pitch_floor=60, pitch_ceiling=400)
    p_lo = snd.to_pitch_cc(time_step=HOP, pitch_floor=30, pitch_ceiling=400,
                           very_accurate=True, voicing_threshold=0.35)
    f_md, f_lo = track(p_md, t), track(p_lo, t)
    inten = track(snd.to_intensity(minimum_pitch=60, time_step=HOP), t)

    pp = call([snd, p_lo], "To PointProcess (cc)")
    n = call(pp, "Get number of points")
    pt = np.array([call(pp, "Get time from index", k) for k in range(1, n + 1)])
    jit = np.zeros_like(t)
    if n > 3:
        T = np.diff(pt)
        ok = (T[1:] < 1 / 30) & (T[:-1] < 1 / 30)
        j = np.where(ok, np.abs(np.diff(T)) / ((T[1:] + T[:-1]) / 2), np.nan)
        jt = pt[2:]
        lo = np.searchsorted(jt, t - 0.015)
        hi = np.searchsorted(jt, t + 0.015)
        for k in np.nonzero(hi - lo >= 3)[0]:
            seg = j[lo[k]:hi[k]]
            seg = seg[~np.isnan(seg)]
            if len(seg) >= 2:
                jit[k] = np.median(seg)
    return t, f_md, f_lo, inten, jit, pt


def voiced_gate(snd, t):
    """True where the frame is voiced (energy under 1 kHz dominates 3 kHz+): fricatives,
    breaths and plosive bursts never count as fry, so PSOLA never smears an "s" into hiss."""
    y = snd.values[0]
    sr = snd.sampling_frequency
    n = int(0.03 * sr)
    win = np.hanning(n)
    f = np.fft.rfftfreq(n, 1 / sr)
    lo_b, hi_b = (f >= 60) & (f < 1000), f >= 3000
    out = np.zeros(len(t), bool)
    for k, tc in enumerate(t):
        i0 = int(tc * sr) - n // 2
        if i0 < 0 or i0 + n > len(y):
            continue
        P = np.abs(np.fft.rfft(y[i0:i0 + n] * win)) ** 2
        out[k] = P[lo_b].sum() > 4.0 * P[hi_b].sum()
    return out


PUNCT = tuple(",.?!;:\u2014\u2026")


def tail_windows(words, dur):
    """[(a, b, word)] windows on the tails of phrase-final words (raw-voice seconds)."""
    out = []
    for i, w in enumerate(words):
        nxt = words[i + 1]["start"] if i + 1 < len(words) else dur
        txt = w["w"].strip()
        if not (txt.endswith(PUNCT) or nxt - w["end"] >= 0.2 or i + 1 == len(words)):
            continue
        a = w["start"] + 0.45 * (w["end"] - w["start"])
        b = min(w["end"] + 0.08, nxt - 0.01)
        if b - a >= 0.04:
            out.append((a, b, txt))
    return out


def window_mask(t, wins):
    m = np.zeros(len(t), bool)
    for a, b, _ in wins or []:
        m |= (t >= a) & (t < b)
    return m


def detect(snd, base=None, wins=None):
    t, f_md, f_lo, inten, jit, pulses = analyse(snd)
    loud = inten[inten > 0]
    speech = inten > np.percentile(loud, 35)
    if base is None:
        v = f_md[(f_md > 0) & speech]
        base = {"median": float(np.median(v)), "p10": float(np.percentile(v, R["floor"]))}
    med = base["median"]
    low = (f_lo > 0) & (f_lo < R["low"] * med) & ((f_md == 0) | (f_md < max(0.75, R["low"]) * med))
    gap = (f_md == 0) & (f_lo > 0) & (f_lo < R["gap"] * med)
    rough = (jit > R["jit"]) & (f_lo > 0) & (f_lo < R["rough"] * med)
    fry = speech & voiced_gate(snd, t) & (low | gap | rough)
    if wins is not None:
        fry &= window_mask(t, wins)

    regs, s = [], None
    for i, x in enumerate(np.append(fry, False)):
        if x and s is None:
            s = i
        elif not x and s is not None:
            regs.append([t[s], t[i - 1] + HOP])
            s = None
    merged = []
    for a, b in regs:
        if merged and a - merged[-1][1] < 0.03:
            merged[-1][1] = b
        else:
            merged.append([a, b])
    merged = [[max(0, a - 0.015), min(snd.duration, b + 0.015)] for a, b in merged if b - a >= (0.04 if wins is not None else 0.025)]
    share = float(fry.sum() / max(1, speech.sum()))
    return dict(t=t, f_md=f_md, f_lo=f_lo, fry=fry, speech=speech, base=base,
                regions=merged, share=share, pulses=pulses)


def modal_near(d, a, b):
    t, f, fry = d["t"], d["f_md"], d["fry"]
    m = (t >= a) & (t < b) & (f > 0) & ~fry
    return float(np.median(f[m])) if m.sum() >= 3 else None


def contour(d, a, b):
    pre = modal_near(d, a - 0.1, a)
    post = modal_near(d, b, b + 0.1)
    n = max(2, int(round((b - a) / HOP)) + 1)
    if pre and post:
        c = np.linspace(pre, post, n)
    elif pre:
        c = pre * np.linspace(1.0, 0.92, n)
    elif post:
        c = np.full(n, post)
    else:
        c = np.full(n, 0.9 * d["base"]["median"])
    med = d["base"]["median"]
    if c.max() > 1.3 * med or c.min() < 0.6 * med:
        c = 0.95 * med * np.linspace(1.0, 0.92, n)
    return np.linspace(a, b, n), np.maximum(c, d["base"]["p10"])


def points(pp):
    return np.array([call(pp, "Get time from index", k + 1) for k in range(call(pp, "Get number of points"))])


def repair(snd, d, strength):
    """Praat overlap-add with the pitch tier replaced only inside fry regions. Praat treats pulse
    gaps over 20 ms as unvoiced and copies them unchanged, so inside each region the glottal
    pulses are refilled at <= 12.5 ms spacing first."""
    sr = snd.sampling_frequency
    y = snd.values[0]
    regs = [[max(0, a - 0.02), min(snd.duration, b + 0.02)] for a, b in d["regions"]]
    if not regs:
        return y.copy(), []
    man = call(snd, "To Manipulation", HOP, 50, 400)
    pp = call(man, "Extract pulses")
    pts = points(pp)
    keep = np.ones(len(pts), bool)
    for a, b in regs:
        keep &= ~((pts >= a) & (pts < b))
    new = [pts[keep]]
    lo = points(call([snd, snd.to_pitch_cc(time_step=HOP, pitch_floor=30, pitch_ceiling=400,
                                           very_accurate=True)], "To PointProcess (cc)"))
    for a, b in regs:
        p = np.sort(np.concatenate([[a], lo[(lo > a) & (lo < b)], [b]]))
        fill = [p[0]]
        for x0, x1 in zip(p[:-1], p[1:]):
            fill += list(np.linspace(x0, x1, int(np.ceil((x1 - x0) / 0.0125)) + 1)[1:])
        new.append(np.array(fill))
    call(pp, "Remove points between", 0, snd.duration)
    for t in np.unique(np.round(np.concatenate(new), 5)):
        call(pp, "Add point", float(t))
    call([pp, man], "Replace pulses")

    pt = call(man, "Extract pitch tier")
    log = []
    for a, b in regs:
        tt, ft = contour(d, a, b)
        if strength < 1:
            m = (d["t"] >= a) & (d["t"] <= b)
            src = d["f_lo"][m]
            src = np.interp(tt, d["t"][m], np.where(src > 0, src, ft.mean())) if m.sum() > 1 else ft
            ft = src + strength * (ft - src)
        call(pt, "Remove points between", a, b)
        for t, f in zip(tt[::4], ft[::4]):
            call(pt, "Add point", float(t), float(f))
        log.append({"t0": round(a, 3), "t1": round(b, 3), "f0_target": round(float(ft.mean()), 1)})
    call([pt, man], "Replace pitch tier")
    res = call(man, "Get resynthesis (overlap-add)").values[0]

    n = min(len(y), len(res))
    mask = np.zeros(n)
    for a, b in regs:
        mask[int(a * sr):int(b * sr)] = 1
    k = int(0.015 * sr)
    mask = np.clip(np.convolve(mask, np.hanning(k) / np.hanning(k).sum(), "same"), 0, 1)
    out = y.copy()
    out[:n] = np.sqrt(1 - mask) * y[:n] + np.sqrt(mask) * res[:n]
    return out, log


def soften_tails(y, sr, db=TAIL_DB, wins=None):
    """Deep creak (F0 under 60 Hz, e.g. the end of a phrase-final word) cannot be re-pitched
    cleanly; turn it down instead so the word ends cleanly."""
    p = parselmouth.Sound(y, sampling_frequency=sr).to_pitch_cc(
        time_step=HOP, pitch_floor=30, pitch_ceiling=400, very_accurate=True, voicing_threshold=0.35)
    xs, f = np.asarray(p.xs()), p.selected_array["frequency"]
    runs = []
    for i in np.nonzero((f > 0) & (f < 60))[0]:
        if runs and xs[i] - runs[-1][1] < 0.04:
            runs[-1][1] = xs[i]
        else:
            runs.append([xs[i], xs[i]])
    runs = [[a - 0.01, b + 0.02] for a, b in runs if b - a >= 0.015]
    if wins is not None:
        runs = [[max(a, wa), min(b, wb)] for a, b in runs for wa, wb, _ in wins if a < wb and b > wa]
        runs = [r for r in runs if r[1] - r[0] >= 0.015]
    g = np.ones(len(y))
    for a, b in runs:
        g[max(0, int(a * sr)):int(b * sr)] = 10 ** (db / 20)
    k = int(0.02 * sr)
    g = np.convolve(g, np.hanning(k) / np.hanning(k).sum(), "same")
    return y * g, runs


def ab_clips(y_in, y_out, sr, regions, folder, k=12):
    worst = sorted(regions, key=lambda r: r[0] - r[1])[:k]
    gap = np.zeros(int(0.35 * sr))
    parts_in, parts_out = [], []
    for a, b in sorted(worst):
        i0, i1 = int(max(0, a - 0.5) * sr), int(min(len(y_in) / sr, b + 0.5) * sr)
        parts_in += [y_in[i0:i1], gap]
        parts_out += [y_out[i0:i1], gap]
    folder.mkdir(parents=True, exist_ok=True)
    if parts_in:
        sf.write(folder / "defry_before.wav", np.concatenate(parts_in), int(sr), subtype="PCM_24")
        sf.write(folder / "defry_after.wav", np.concatenate(parts_out), int(sr), subtype="PCM_24")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("inp")
    ap.add_argument("out")
    ap.add_argument("--strength", type=float, default=1.0, help="0 = off, 1 = full pitch repair")
    ap.add_argument("--reach", choices=list(REACH), default="wide",
                    help="wide = also catch milder creak and floor the pitch at the 25th percentile")
    ap.add_argument("--words", default=None, help="JSON {words:[{w,start,end}]} in raw-voice seconds: repair only phrase-final word tails")
    ap.add_argument("--tail-db", type=float, default=TAIL_DB)
    ap.add_argument("--report", default=None, help="write regions + stats as JSON")
    ap.add_argument("--ab", default=None, help="folder for defry_before/after.wav clips")
    a = ap.parse_args()
    global R
    R = REACH[a.reach]

    snd = parselmouth.Sound(a.inp).convert_to_mono()
    sr = snd.sampling_frequency
    if a.strength <= 0:
        sf.write(a.out, snd.values[0], int(sr), subtype="PCM_24")
        print("defry off (strength 0): copied")
        return
    wins = None
    if a.words:
        wins = tail_windows(json.loads(Path(a.words).read_text())["words"], snd.duration)
        print(f"defry: {len(wins)} phrase-final word tails searched")
    d = detect(snd, wins=wins)
    y, log = repair(snd, d, min(1.0, a.strength))
    y, tails = soften_tails(y, sr, a.tail_db, wins)
    for r in log:
        r["word"] = next((w for wa, wb, w in wins or [] if r["t0"] < wb and r["t1"] > wa), None)
    peak = np.max(np.abs(y))
    if peak > 0.999:
        y *= 0.999 / peak
    sf.write(a.out, y, int(sr), subtype="PCM_24")

    after = detect(parselmouth.Sound(y, sampling_frequency=sr), d["base"], wins)
    secs = sum(b - a_ for a_, b in d["regions"])
    print(f"defry: speaker median {d['base']['median']:.0f} Hz | {len(d['regions'])} fry regions, "
          f"{secs:.1f} s | fry share {100 * d['share']:.1f} % -> {100 * after['share']:.1f} % "
          f"({len(after['regions'])} regions left), {len(tails)} deep tails softened")
    if a.report:
        Path(a.report).parent.mkdir(parents=True, exist_ok=True)
        Path(a.report).write_text(json.dumps({
            "base": d["base"], "share_before": d["share"], "share_after": after["share"],
            "regions": log, "tails": [[round(x, 3), round(z, 3)] for x, z in tails], "left": [[round(x, 3), round(z, 3)] for x, z in after["regions"]]}, indent=1))
    if a.ab:
        ab_clips(snd.values[0], y, sr, d["regions"], Path(a.ab))


if __name__ == "__main__":
    main()
