"""Paper / stop-motion sound effects, synthesized with numpy (deterministic: same seed, same sound).

Every voice is soft-edged on purpose: the narration was already judged harsh once, so nothing
here has energy above ~8 kHz and the transients are rounded.

    .venv/bin/python sfx.py          # out/ab/sfx_bank.wav: every kind, 3 variations each

Used by mix.py through `render(kind, seed, dur)`.
"""
import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt

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

def spell(rng, dur=0.7):
    """Wizard charges a spell: rising sung tone with vibrato, a shimmer of soft glints, round release."""
    dur = max(0.3, dur or 0.7)
    n = int((dur + 0.35) * SR)
    t = _t(n)
    p = np.clip(t / dur, 0, 1)
    f = 260 * 2 ** (2.2 * p) * (1 + 0.012 * np.sin(2 * np.pi * 6.5 * t))
    ph = 2 * np.pi * np.cumsum(f) / SR
    tone = np.sin(ph) + 0.35 * np.sin(2 * ph) + 0.15 * np.sin(3 * ph)
    e = np.minimum(1, t / 0.05) * p ** 0.6 * np.where(t < dur, 1, np.exp(-(t - dur) / 0.12))
    air = _bp(_noise(rng, n), 1800, 4800) * 0.35
    glints = np.zeros(n)
    for _ in range(int(14 * dur)):
        k0, m = int(rng.uniform(0.1, 1.0) * dur * SR), int(0.06 * SR)
        if k0 + m >= n:
            continue
        tt = _t(m)
        glints[k0:k0 + m] += np.sin(2 * np.pi * rng.uniform(1800, 3600) * tt) * np.exp(-tt / 0.018) * rng.uniform(0.3, 0.7)
    y = _lp(0.7 * tone * e + air * e + 0.5 * glints, 6000)
    return _norm(y)


def blast(rng, dur=None):
    """Spell impact: rounded boom (pitch-dropping thump + dark noise burst) and a short crackle tail."""
    n = int(1.2 * SR)
    t = _t(n)
    f = 70 * np.exp(-t / 0.12) + 34
    thump = np.sin(2 * np.pi * np.cumsum(f) / SR) * _env(n, 0.006, 0.22)
    body = _lp(_noise(rng, n), 700) * _env(n, 0.01, 0.28)
    crackle = np.zeros(n)
    for _ in range(40):
        k0, m = int(rng.uniform(0.05, 0.7) * SR), int(0.008 * SR)
        crackle[k0:k0 + m] += _noise(rng, m) * np.exp(-_t(m) / 0.002) * np.exp(-k0 / SR / 0.3)
    crackle = _bp(crackle, 700, 3200)
    return _norm(1.0 * thump + 0.8 * _norm(body) + 0.25 * _norm(crackle))


def thunder(rng, dur=1.6):
    """Lightning strike: a rounded crack, then a rolling low rumble."""
    dur = max(0.6, dur or 1.6)
    n = int((dur + 0.4) * SR)
    t = _t(n)
    crack = _bp(_noise(rng, n), 300, 3500) * _env(n, 0.003, 0.06)
    roll = np.zeros(n)
    for _ in range(7):
        k0 = int(rng.uniform(0.02, 0.6) * dur * SR)
        roll[k0:] += np.exp(-_t(n - k0) / rng.uniform(0.15, 0.4)) * rng.uniform(0.4, 1.0)
    roll *= np.minimum(1, t / 0.02)
    rumble = _lp(_brown(rng, n), 220) * roll
    return _norm(0.6 * _norm(crack) + 1.0 * _norm(rumble))


def clang(rng, dur=None):
    """Two divine weapons meet: inharmonic metal ring with a soft-edged strike."""
    n = int(1.1 * SR)
    t = _t(n)
    f0 = rng.uniform(380, 460)
    y = np.zeros(n)
    for k, a, d in [(1.0, 1.0, 0.35), (2.76, 0.6, 0.22), (5.4, 0.35, 0.12), (8.93, 0.18, 0.06)]:
        y += a * np.sin(2 * np.pi * f0 * k * t + rng.uniform(0, 6)) * _env(n, 0.002, d)
    hit = _bp(_noise(rng, n), 900, 4000) * _env(n, 0.001, 0.012)
    return _norm(_lp(y + 0.4 * _norm(hit), 6500))


def warp(rng, dur=1.2):
    """Time portal: swirling tone sliding down, airy band circling left-right (stereo)."""
    dur = max(0.4, dur or 1.2)
    n = int((dur + 0.3) * SR)
    t = _t(n)
    p = np.clip(t / dur, 0, 1)
    e = np.sin(np.pi * np.minimum(1, t / dur)) ** 0.8 * (t <= dur)
    f = (700 * 2 ** (-1.6 * p)) * (1 + 0.04 * np.sin(2 * np.pi * 7 * t))
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.3 * np.sin(2 * np.pi * np.cumsum(1.5 * f) / SR)
    x = _noise(rng, n)
    s = 0.5 + 0.5 * np.sin(2 * np.pi * 2.2 * t)
    air = _bp(x, 400, 1200) * (1 - s) + _bp(x, 1200, 3000) * s * 0.6
    y = _lp((0.6 * tone + 0.8 * _norm(air)) * e, 5000)
    pan = 0.7 * np.sin(2 * np.pi * 1.1 * t)
    gl, gr = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    st = np.stack([y * gl, y * gr], 1)
    return st / np.abs(st).max()

# ------------------------------------------------------------------------------- ambience beds
# Long stereo beds placed with a cue `dur`. Each fades in/out over BED_FADE so hard picture cuts get a
# short sound overlap instead of a click. Nothing above ~6 kHz; levels are set in mix.py (BED_DB).
BED_FADE = 0.15
VOWELS = [(730, 1090), (530, 1840), (270, 2290), (570, 840), (300, 870), (660, 1700), (490, 1350)]


def _bed_env(n, fi=BED_FADE, fo=BED_FADE):
    e = np.ones(n)
    a, b = min(n, int(fi * SR)), min(n, int(fo * SR))
    e[:a] = np.sin(np.linspace(0, np.pi / 2, a)) ** 2
    e[n - b:] *= np.cos(np.linspace(0, np.pi / 2, b)) ** 2
    return e


def _stereo(l, r):
    return np.stack([l, r], 1)


def _pan(y, x):
    a = (np.clip(x, -1, 1) + 1) * np.pi / 4
    return _stereo(y * np.cos(a), y * np.sin(a)) * np.sqrt(2)


def _brown(rng, n):
    y = np.cumsum(_noise(rng, n))
    return _hp(y, 20, 1)


def _room(rng, n, size=0.35):
    """Cheap diffuse tail: decaying noise impulse response, separate per channel."""
    m = int(size * SR)
    out = []
    for _ in range(2):
        ir = _lp(_noise(rng, m), 3500) * np.exp(-_t(m) / (size / 4))
        ir[0] += 6
        out.append(ir / np.abs(ir).sum() * 6)
    return out


def _voiced(rng, n, f0, vowel, breath=0.12):
    """One syllable: glottal pulse train shaped by two formant bands."""
    t = _t(n)
    f = f0 * (1 + 0.012 * np.sin(2 * np.pi * rng.uniform(4, 6) * t)) * (1 + 0.004 * _noise(rng, n).cumsum() / np.sqrt(n))
    ph = np.cumsum(f) / SR
    src = (ph % 1.0) * 2 - 1
    src = _lp(src, 3200, 2) + breath * _noise(rng, n)
    F1, F2 = vowel
    y = _bp(src, F1 * 0.8, F1 * 1.25) + 0.55 * _bp(src, F2 * 0.88, F2 * 1.13) + 0.15 * _bp(src, 2500, 3300)
    return y


def _talker(rng, n, f0, rate=4.6, gain=1.0):
    """A murmuring voice: phrases of syllables with rising/falling intonation and pauses."""
    y = np.zeros(n)
    at = rng.uniform(0, 1.2)
    while at < n / SR:
        syl = int(rng.integers(3, 12))
        contour = rng.uniform(-0.25, 0.15)
        for k in range(syl):
            L = rng.uniform(0.11, 0.26)
            m = int(L * SR)
            i = int(at * SR)
            if i >= n:
                break
            p = f0 * (1 + contour * k / syl + rng.uniform(-0.06, 0.06))
            s = _voiced(rng, m, p, VOWELS[rng.integers(len(VOWELS))]) * np.sin(np.pi * np.arange(m) / m) ** 1.5
            s *= rng.uniform(0.6, 1.0) * (1 - 0.35 * k / syl)
            y[i:i + m] += s[: n - i]
            at += L * rng.uniform(0.85, 1.05) + (rng.uniform(0.04, 0.12) if rng.random() < 0.25 else 0)
        at += rng.uniform(0.3, 1.4)
    return y * gain


def _laugher(rng, n, f0, start=0.0, syl=(5, 9), rate=(0.15, 0.2), vowel=(730, 1150), creak=0.0):
    """'ha-ha-ha': breathy h onset + voiced vowel per syllable, pitch and level falling."""
    y = np.zeros(n)
    at = start
    k_n = int(rng.integers(*syl))
    for k in range(k_n):
        i = int(at * SR)
        if i >= n:
            break
        L = rng.uniform(0.07, 0.11)
        m = int(L * SR)
        p = f0 * (1.15 - 0.35 * k / k_n) * rng.uniform(0.96, 1.04)
        v = _voiced(rng, m, p, vowel, breath=0.25) * np.sin(np.pi * np.arange(m) / m) ** 0.8
        if creak:
            v *= 1 - creak * (np.sin(2 * np.pi * p / 2 * _t(m)) > 0)
        h = int(0.035 * SR)
        hb = _bp(_noise(rng, h), 800, 2600) * np.hanning(h) * 0.5
        seg = np.concatenate([hb, v]) * (1 - 0.45 * k / k_n)
        y[i:i + len(seg)] += seg[: n - i]
        at += rng.uniform(*rate)
    return y


def night(rng, dur=4.0):
    """Night outside: a few crickets at different pitches + very distant traffic wash."""
    dur = max(1.0, dur or 4.0)
    n = int(dur * SR)
    t = _t(n)
    l, r = np.zeros(n), np.zeros(n)
    for c in range(4):
        fc = rng.uniform(3600, 4700)
        rate, chirp = rng.uniform(0.45, 0.8), rng.integers(2, 5)
        g = np.zeros(n)
        at = rng.uniform(0, rate)
        while at < dur:
            for j in range(chirp):
                i, m = int((at + j * 0.034) * SR), int(0.022 * SR)
                if i + m < n:
                    g[i:i + m] += np.hanning(m)
            at += rate * rng.uniform(0.9, 1.1)
        y = np.sin(2 * np.pi * fc * t) * g * rng.uniform(0.3, 1.0)
        a = (rng.uniform(-0.8, 0.8) + 1) * np.pi / 4
        l += y * np.cos(a); r += y * np.sin(a)
    wash = _bp(_brown(rng, n), 60, 500)
    wash = _norm(wash) * (0.75 + 0.25 * np.sin(2 * np.pi * rng.uniform(0.05, 0.1) * t + rng.uniform(0, 6)))
    l, r = _norm(_lp(l, 5500)) * 0.35 + wash, _norm(_lp(r, 5500)) * 0.35 + wash * 0.95
    e = _bed_env(n)
    return _norm(_stereo(l * e, r * e))


def traffic(rng, dur=4.0):
    """Street: low rumble, cars passing left/right with tyre hiss, one soft distant horn."""
    dur = max(1.5, dur or 4.0)
    n = int(dur * SR)
    t = _t(n)
    rumble = _norm(_lp(_brown(rng, n), 220)) * 0.6
    l, r = rumble.copy(), rumble * 0.96
    at = rng.uniform(-1.0, 0.5)
    while at < dur:
        L = rng.uniform(2.2, 3.6)
        m = int(L * SR)
        i = int(at * SR)
        car = _bp(_noise(rng, m), 120, 900) + 0.35 * _bp(_noise(rng, m), 1200, 4000)
        engine = np.sin(2 * np.pi * np.cumsum(rng.uniform(60, 95) * (1.08 - 0.16 * np.arange(m) / m)) / SR)
        y = (_norm(car) + 0.3 * engine) * np.exp(-((np.arange(m) / m - 0.5) / 0.2) ** 2) * rng.uniform(0.5, 1.0)
        d = 1 if rng.random() < 0.5 else -1
        x = np.linspace(-0.9 * d, 0.9 * d, m)
        a = (x + 1) * np.pi / 4
        s0, s1 = max(0, i), min(n, i + m)
        if s1 > s0:
            l[s0:s1] += (y * np.cos(a))[s0 - i:s1 - i]
            r[s0:s1] += (y * np.sin(a))[s0 - i:s1 - i]
        at += rng.uniform(0.7, 1.8)
    if dur > 3 and rng.random() < 0.7:
        i, m = int(rng.uniform(0.5, dur - 1.0) * SR), int(0.35 * SR)
        f = np.where(np.arange(m) < m * 0.45, 392, 330)
        horn = _lp(((np.cumsum(f) / SR) % 1.0) * 2 - 1, 1600) * np.hanning(m) * 0.25
        l[i:i + m] += horn * 0.7; r[i:i + m] += horn * 0.4
    l, r = _lp(l, 6000), _lp(r, 6000)
    e = _bed_env(n)
    return _norm(_stereo(l * e, r * e))


def _crowd(rng, n, talkers, f0s, near=0.0):
    l, r = np.zeros(n), np.zeros(n)
    for k in range(talkers):
        y = _talker(rng, n, rng.uniform(*f0s[k % len(f0s)]), gain=rng.uniform(0.5, 1.0))
        a = (rng.uniform(-0.85, 0.85) + 1) * np.pi / 4
        l += y * np.cos(a); r += y * np.sin(a)
    rl, rr = _room(rng, n, 0.45 - 0.2 * near)
    wet = 0.7 - 0.4 * near
    l = (1 - wet) * l + wet * fftconvolve(l, rl)[:n]
    r = (1 - wet) * r + wet * fftconvolve(r, rr)[:n]
    return _lp(l, 3800), _lp(r, 3800)


def crowd(rng, dur=4.0):
    """Busy public place: a dozen unintelligible talkers, men and women, in a reflective room."""
    dur = max(1.0, dur or 4.0)
    n = int(dur * SR)
    l, r = _crowd(rng, n, 12, [(95, 135), (170, 230)])
    floor = _lp(_brown(rng, n), 400)
    e = _bed_env(n)
    return _norm(_stereo((l + 0.2 * _norm(floor) * np.abs(l).max()) * e, (r + 0.2 * _norm(floor) * np.abs(r).max()) * e))


def family(rng, dur=4.0):
    """Relatives at home: fewer, closer voices (adults + kids), bursts of laughter now and then."""
    dur = max(1.0, dur or 4.0)
    n = int(dur * SR)
    l, r = _crowd(rng, n, 6, [(100, 130), (190, 240), (260, 320)], near=0.6)
    at = rng.uniform(0.6, 1.6)
    while at < dur - 0.8:
        y = _laugher(rng, n, rng.uniform(170, 260), start=at, syl=(4, 7))
        a = (rng.uniform(-0.7, 0.7) + 1) * np.pi / 4
        g = np.abs(l).max() * 1.4 / (np.abs(y).max() + 1e-9)
        l += y * g * np.cos(a); r += y * g * np.sin(a)
        at += rng.uniform(2.2, 4.0)
    e = _bed_env(n)
    return _norm(_stereo(l * e, r * e))


def laugh(rng, dur=None):
    """A group bursting into laughter (3-5 people), swelling then settling."""
    dur = max(1.2, dur or 2.2)
    n = int((dur + 0.4) * SR)
    l, r = np.zeros(n), np.zeros(n)
    for k in range(int(rng.integers(3, 6))):
        y = _laugher(rng, n, rng.uniform(140, 300), start=rng.uniform(0, 0.25), syl=(6, 12),
                     vowel=VOWELS[[0, 5, 1][k % 3]])
        a = (rng.uniform(-0.7, 0.7) + 1) * np.pi / 4
        l += y * np.cos(a); r += y * np.sin(a)
    rl, rr = _room(rng, n, 0.3)
    l, r = 0.7 * l + 0.3 * fftconvolve(l, rl)[:n], 0.7 * r + 0.3 * fftconvolve(r, rr)[:n]
    e = _bed_env(n, 0.005, 0.3)
    return _norm(_stereo(_lp(l, 4500) * e, _lp(r, 4500) * e))


def cackle(rng, dur=None):
    """One old wizard's cackle: 'heh-heh-heh-HAA', a little creaky, falling pitch."""
    dur = max(0.8, dur or 1.4)
    n = int((dur + 0.4) * SR)
    y = _laugher(rng, n, rng.uniform(190, 220), syl=(7, 11), rate=(0.12, 0.15), vowel=(560, 1750), creak=0.35)
    rl, _ = _room(rng, n, 0.25)
    y = 0.8 * y + 0.2 * fftconvolve(y, rl)[:n]
    return _norm(_lp(y, 4800) * _bed_env(n, 0.005, 0.25))


def office(rng, dur=4.0):
    """Open-plan office: air handling, scattered keyboards, a distant phone, low murmur."""
    dur = max(1.0, dur or 4.0)
    n = int(dur * SR)
    t = _t(n)
    air = _norm(_lp(_hp(_noise(rng, n), 80), 900)) * 0.35 + 0.12 * np.sin(2 * np.pi * 118 * t)
    l, r = air.copy(), air * 0.97
    ml, mr = _crowd(rng, n, 5, [(100, 135), (175, 225)])
    m = max(np.abs(ml).max(), 1e-9)
    l += ml / m * 0.35; r += mr / m * 0.35
    for k in range(3):
        kb = type_(rng, dur)[:n] * rng.uniform(0.15, 0.3)
        kb = np.pad(kb, (0, n - len(kb)))
        kb = _lp(kb, 3000) * (np.sin(2 * np.pi * rng.uniform(0.08, 0.2) * t + rng.uniform(0, 6)) > 0.2)
        a = (rng.uniform(-0.9, 0.9) + 1) * np.pi / 4
        l += kb * np.cos(a); r += kb * np.sin(a)
    if dur > 2.5:
        i = int(rng.uniform(0.3, dur - 2.0) * SR)
        for b in range(2):
            m2 = int(0.4 * SR)
            ring = (np.sin(2 * np.pi * 1180 * _t(m2)) + 0.6 * np.sin(2 * np.pi * 1480 * _t(m2))) * (np.sin(2 * np.pi * 22 * _t(m2)) > 0)
            ring = _lp(ring * np.hanning(m2), 2500) * 0.08
            j = i + b * int(0.55 * SR)
            if j + m2 < n:
                l[j:j + m2] += ring * 0.4; r[j:j + m2] += ring
    e = _bed_env(n)
    return _norm(_stereo(_lp(l, 6000) * e, _lp(r, 6000) * e))


def room(rng, dur=4.0):
    """Quiet room tone at home: soft air, a fridge-like hum, tiny creaks."""
    dur = max(1.0, dur or 4.0)
    n = int(dur * SR)
    t = _t(n)
    air = _norm(_lp(_hp(_noise(rng, n), 60), 600))
    hum = 0.25 * np.sin(2 * np.pi * 100 * t) * (0.8 + 0.2 * np.sin(2 * np.pi * 0.3 * t))
    y = air + hum
    e = _bed_env(n)
    return _norm(_stereo(y * e, (0.9 * air + hum) * e))


VOICES = {"paper": paper, "tape": tape, "stamp": stamp, "slap": slap, "whoosh": whoosh, "tick": tick,
          "type": type_, "cross": cross, "fan": fan, "hiss": hiss, "pop": pop,
          "spell": spell, "blast": blast, "thunder": thunder, "clang": clang, "warp": warp,
          "night": night, "traffic": traffic, "crowd": crowd, "family": family, "laugh": laugh, "cackle": cackle,
          "office": office, "room": room}
BEDS = {"night", "traffic", "crowd", "family", "office", "room"}


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
            parts += [render(kind, 1000 + v, 4.0 if kind in BEDS else 1.2 if kind in ("whoosh", "fan", "hiss", "type", "spell", "warp", "thunder") else None) * 0.5,
                      np.zeros((int(0.35 * SR), 2))]
        parts.append(np.zeros((int(0.5 * SR), 2)))
    y = np.concatenate(parts)
    out.parent.mkdir(parents=True, exist_ok=True)
    sf.write(out, y, SR, subtype="PCM_24")
    print(f"wrote {out} ({len(y) / SR:.1f} s): " + ", ".join(VOICES))


if __name__ == "__main__":
    main()
