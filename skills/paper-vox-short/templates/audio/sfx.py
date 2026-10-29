"""Paper / stop-motion sound effects, synthesized with numpy (deterministic: same seed, same sound).

Every voice is soft-edged on purpose: the narration was already judged harsh once, so nothing
here has energy above ~8 kHz and the transients are rounded.

    .venv/bin/python sfx.py          # out/ab/sfx_bank.wav: every kind, 3 variations each

Used by mix.py through `render(kind, seed, dur)`.
"""
import numpy as np
from scipy.signal import butter, sosfilt

SR = 48000


def _t(n):
    return np.arange(n) / SR


def _bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], btype="band", fs=SR, output="sos"), x)


def _lp(x, f, order=4):
    return sosfilt(butter(order, f, btype="low", fs=SR, output="sos"), x)


def _hp(x, f, order=2):
    return sosfilt(butter(order, f, btype="high", fs=SR, output="sos"), x)


def _env(n, a, d):
    """Attack a s (raised cosine), exponential decay with time constant d s."""
    t = _t(n)
    e = np.exp(-np.maximum(t - a, 0) / d)
    na = max(1, int(a * SR))
    e[:na] *= 0.5 - 0.5 * np.cos(np.pi * np.arange(na) / na)
    return e


def _fade(x, fi=0.003, fo=0.01):
    n = len(x)
    a, b = min(n, int(fi * SR)), min(n, int(fo * SR))
    x[:a] *= np.linspace(0, 1, a)
    x[n - b:] *= np.linspace(1, 0, b)
    return x


def _norm(x, peak=1.0):
    m = np.abs(x).max()
    return x * (peak / m) if m > 0 else x


def _noise(rng, n):
    return rng.standard_normal(n)


# ------------------------------------------------------------------------------------- voices
def paper(rng, dur=None):
    """Cut-out lands: a short crinkle of micro-transients over a soft body."""
    n = int(0.28 * SR)
    y = np.zeros(n)
    for _ in range(rng.integers(6, 11)):
        at = int(rng.uniform(0, 0.11) * SR)
        m = int(rng.uniform(0.006, 0.02) * SR)
        burst = _noise(rng, m) * _env(m, 0.001, rng.uniform(0.003, 0.008)) * rng.uniform(0.3, 1)
        y[at:at + m] += burst[: n - at]
    y = _bp(y, 900 * rng.uniform(0.85, 1.2), 5200)
    body = np.sin(2 * np.pi * rng.uniform(140, 190) * _t(n)) * _env(n, 0.002, 0.025) * 0.35
    return _norm(_lp(y, 6500) + body)


def tape(rng, dur=None):
    """Tape strip pulled and pressed: crackly rip, then a soft press."""
    L = rng.uniform(0.28, 0.4)
    n = int(L * SR)
    t = _t(n)
    crackle = (rng.random(n) < 0.035 + 0.05 * t / L).astype(float) * rng.uniform(0.3, 1, n)
    rip = _bp(crackle + 0.15 * _noise(rng, n), 1200, 5500) * np.sin(np.pi * np.clip(t / (L * 0.8), 0, 1)) ** 0.7
    m = int(0.06 * SR)
    press = np.zeros(n)
    press[n - m:] = _lp(_noise(rng, m), 900) * _env(m, 0.002, 0.012)
    return _norm(_lp(rip, 7000) + 0.6 * _norm(press))


def stamp(rng, dur=None):
    """Rubber stamp slam: low thump (pitch drop) + paper slap + tiny wood click."""
    n = int(0.45 * SR)
    t = _t(n)
    f = 95 * rng.uniform(0.9, 1.1) * np.exp(-t / 0.08) + 48
    thump = np.sin(2 * np.pi * np.cumsum(f) / SR) * _env(n, 0.002, 0.09)
    m = int(0.05 * SR)
    slap = np.zeros(n)
    slap[:m] = _bp(_noise(rng, m), 700, 4200) * _env(m, 0.0015, 0.012)
    click = np.zeros(n)
    k = int(0.004 * SR)
    click[:k] = _bp(_noise(rng, k), 1500, 3500)
    return _norm(1.0 * thump + 0.55 * _norm(slap) + 0.15 * _norm(click))


def slap(rng, dur=None):
    """Headline word strip lands: dry paper slap with a little body."""
    n = int(0.16 * SR)
    y = _bp(_noise(rng, n), 600 * rng.uniform(0.9, 1.15), 3800) * _env(n, 0.0015, 0.018)
    body = np.sin(2 * np.pi * rng.uniform(120, 160) * _t(n)) * _env(n, 0.002, 0.03) * 0.5
    return _norm(_lp(y, 5000) + body)


def whoosh(rng, dur=0.85):
    """Camera glide: band of noise sweeping up then down, panned left to right (stereo)."""
    dur = max(0.3, dur or 0.85)
    n = int((dur + 0.25) * SR)
    t = _t(n)
    p = np.clip(t / dur, 0, 1)
    bell = np.sin(np.pi * p) ** 1.6 * (t <= dur)
    x = _noise(rng, n)
    # time-varying band: crossfade three fixed bands by the sweep position (cheap, smooth)
    lo, mid, hi = _bp(x, 200, 600), _bp(x, 500, 1500), _bp(x, 1200, 3200)
    s = np.sin(np.pi * p)
    y = lo * (1 - s) + mid * s * 0.9 + hi * s ** 3 * 0.45
    y = _lp(y * bell, 4500)
    pan = -0.6 + 1.2 * p
    gl, gr = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    st = np.stack([y * gl, y * gr], 1)
    return st / np.abs(st).max()


def tick(rng, dur=None):
    """Counter step: soft wooden tick."""
    n = int(0.05 * SR)
    t = _t(n)
    f = rng.uniform(1500, 1900)
    y = np.sin(2 * np.pi * f * t) * _env(n, 0.0005, 0.006)
    y += 0.4 * _bp(_noise(rng, n), 800, 3000) * _env(n, 0.0005, 0.003)
    return _norm(_lp(y, 5000))


def type_(rng, dur=0.6):
    """Typewriter / mono text reveal: keystrokes at ~13/s for dur."""
    dur = max(0.15, dur or 0.6)
    n = int((dur + 0.1) * SR)
    y = np.zeros(n)
    at = 0.0
    while at < dur:
        i = int(at * SR)
        m = int(0.03 * SR)
        k = _bp(_noise(rng, m), 1000, 4000) * _env(m, 0.0005, 0.004) * rng.uniform(0.5, 1)
        k += np.sin(2 * np.pi * rng.uniform(260, 340) * _t(m)) * _env(m, 0.001, 0.008) * 0.6
        y[i:i + m] += k[: n - i]
        at += rng.uniform(0.055, 0.1)
    return _norm(_lp(y, 6000))


def cross(rng, dur=0.4):
    """Marker strike: two scratchy strokes."""
    dur = max(0.2, dur or 0.4)
    n = int(dur * SR)
    y = np.zeros(n)
    for s0, s1 in [(0.0, 0.45), (0.5, 0.95)]:
        a, b = int(s0 * n), int(s1 * n)
        m = b - a
        stroke = _bp(_noise(rng, m), 1800, 5000) * np.sin(np.pi * np.arange(m) / m) ** 0.8
        stroke *= 1 + 0.5 * np.sin(2 * np.pi * rng.uniform(25, 40) * _t(m))
        y[a:b] += stroke
    return _norm(_lp(y, 6500))


def fan(rng, dur=2.0):
    """Suction fan: low airy whirr with a blade-pass hum, fade in/out."""
    dur = max(0.8, dur or 2.0)
    n = int(dur * SR)
    t = _t(n)
    air = _lp(_noise(rng, n), 700)
    bp = 85 * rng.uniform(0.95, 1.05)
    hum = np.sin(2 * np.pi * bp * t) * (0.6 + 0.4 * np.sin(2 * np.pi * 7 * t)) * 0.5
    y = (_norm(air) + hum) * np.minimum(1, np.minimum(t / 0.4, (dur - t) / 0.5))
    return _norm(y)


def hiss(rng, dur=0.6):
    """Gas jet: airy hiss, quick attack, smooth release."""
    dur = max(0.2, dur or 0.6)
    n = int((dur + 0.25) * SR)
    t = _t(n)
    y = _lp(_hp(_noise(rng, n), 1000), 4800)
    e = np.minimum(1, t / 0.03) * np.where(t < dur, 1, np.exp(-(t - dur) / 0.08))
    return _norm(y * e)


def pop(rng, dur=None):
    """Small UI element (bubble, chip): soft pitched blip + a hint of paper."""
    n = int(0.12 * SR)
    t = _t(n)
    f0 = rng.uniform(520, 680)
    f = f0 * (0.65 + 0.35 * np.exp(-t / 0.025))
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * _env(n, 0.002, 0.03)
    y += 0.25 * _bp(_noise(rng, n), 1500, 4500) * _env(n, 0.001, 0.01)
    return _norm(y)


VOICES = {"paper": paper, "tape": tape, "stamp": stamp, "slap": slap, "whoosh": whoosh, "tick": tick,
          "type": type_, "cross": cross, "fan": fan, "hiss": hiss, "pop": pop}


def render(kind, seed, dur=None):
    """Stereo float array (n, 2), peak 1.0. Mono voices come back centred."""
    rng = np.random.default_rng(seed)
    y = VOICES[kind](rng, dur)
    if y.ndim == 1:
        y = _fade(y)
        y = np.stack([y, y], 1) * np.sqrt(0.5)
    return y


def main():
    import soundfile as sf
    from pathlib import Path
    out = Path(__file__).resolve().parent.parent / "out" / "ab" / "sfx_bank.wav"
    parts = []
    for kind in VOICES:
        for v in range(3):
            parts += [render(kind, 1000 + v, 1.2 if kind in ("whoosh", "fan", "hiss", "type") else None) * 0.5,
                      np.zeros((int(0.35 * SR), 2))]
        parts.append(np.zeros((int(0.5 * SR), 2)))
    y = np.concatenate(parts)
    out.parent.mkdir(parents=True, exist_ok=True)
    sf.write(out, y, SR, subtype="PCM_24")
    print(f"wrote {out} ({len(y) / SR:.1f} s): " + ", ".join(VOICES))


if __name__ == "__main__":
    main()
