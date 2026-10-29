import os, wave, numpy as np

SR = 48000
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'sfx')
rng = np.random.default_rng(7)


def write(name, x):
    x = np.asarray(x, np.float64)
    if x.ndim == 1: x = np.stack([x, x], 1)
    x = x / (np.abs(x).max() or 1) * .89
    os.makedirs(OUT, exist_ok=True)
    with wave.open(os.path.join(OUT, name + '.wav'), 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((x * 32767).astype('<i2').tobytes())
    on = int(np.argmax(np.abs(x).max(1) > .2 * np.abs(x).max()))
    print(f'{name}: {len(x) / SR:.2f}s onset {on / SR:.3f}s peak {int(np.argmax(np.abs(x).max(1))) / SR:.3f}s')


def band_noise(dur, fc, bw):
    n = int(dur * SR); N, hop = 2048, 512
    win = np.hanning(N); x = rng.standard_normal(n + N); y = np.zeros(n + N); norm = np.zeros(n + N)
    f = np.fft.rfftfreq(N, 1 / SR); lf = np.log2(np.maximum(f, 1))
    for s in range(0, n, hop):
        t = s / SR; c = np.log2(fc(t)); b = bw(t)
        X = np.fft.rfft(x[s:s + N] * win) * np.exp(-.5 * ((lf - c) / b) ** 2)
        y[s:s + N] += np.fft.irfft(X, N) * win; norm[s:s + N] += win ** 2
    return (y / np.maximum(norm, 1e-6))[:n]


def env_ar(n, peak, a_pow=2.0, r_pow=1.6):
    t = np.linspace(0, 1, n); p = peak
    return np.where(t < p, (t / p) ** a_pow, ((1 - t) / (1 - p)) ** r_pow)


def pan(x, l0, l1):
    p = np.linspace(l0, l1, len(x)); a = (p + 1) * np.pi / 4
    return np.stack([x * np.cos(a), x * np.sin(a)], 1)


def whoosh(dur, f0, f1, peak, bw=.9, l0=-.6, l1=.6):
    n = int(dur * SR)
    x = band_noise(dur, lambda t: f0 * (f1 / f0) ** min(1, t / dur), lambda t: bw)
    return pan(x * env_ar(n, peak), l0, l1)


def tone(f, dur, decay, attack=.004, partials=((1, 1),)):
    n = int(dur * SR); t = np.arange(n) / SR
    e = np.minimum(1, t / attack) * np.exp(-t / decay)
    return sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t * (r - 1) * 1.8) for r, a in partials) * e


def pad(x, dur):
    n = int(dur * SR); y = np.zeros((n, 2)) if x.ndim == 2 else np.zeros(n); y[:min(n, len(x))] = x[:n]; return y


def lowpass(x, fc):
    a = np.exp(-2 * np.pi * fc / SR); y = np.zeros_like(x); z = 0.
    for k in range(len(x)): z = (1 - a) * x[k] + a * z; y[k] = z
    return y


def soft_whoosh(dur, f0, f1, peak, l0, l1, body0, body1):
    n = int(dur * SR); t = np.arange(n) / SR; e = env_ar(n, peak, 2.2, 2.6)
    air = band_noise(dur, lambda u: f0 * (f1 / f0) ** min(1, u / dur), lambda u: .55)
    body = np.sin(2 * np.pi * np.cumsum(body0 * (body1 / body0) ** (t / dur)) / SR)
    return pan(air * e, l0, l1) + .35 * np.stack([body * e, body * e], 1)


# intro: the folded Duo floats up into frame
n = int(2.0 * SR); t = np.arange(n) / SR
air = whoosh(2.0, 160, 1500, .72, .6, -.3, .3)
sub = np.sin(2 * np.pi * (38 * t + 14 * t ** 2 / 4.8)) * env_ar(n, .72, 1.6, 2.4)
write('rise', air + .55 * np.stack([sub, sub], 1))

# each line of type landing
write('word', whoosh(.3, 2200, 1300, .3, .45, .2, -.2))

# hinge travel: a short rounded sweep peaking mid-hinge, mirrored for the close
write('hinge_open', soft_whoosh(1.2, 320, 1400, .55, -.5, .5, 140, 210))
write('hinge_close', soft_whoosh(1.2, 1300, 300, .55, .5, -.5, 200, 130))

# the leaves meeting / settling: a rounded magnetic thock
n = int(.18 * SR); t = np.arange(n) / SR
click = lowpass(rng.standard_normal(n) * np.exp(-t / .0018), 2500)
thump = np.sin(2 * np.pi * 130 * t * np.exp(-t * 7)) * np.exp(-t / .035)
ping = tone(1760, .18, .03) * .12
write('snap', 1.6 * click + thump + ping)

# finger tap on Get started / Pin
write('tap', tone(900, .08, .016, .002) + .2 * tone(1800, .08, .008, .001))

# end card: a warm bell chord with a soft low bloom
chord = np.zeros(int(2.8 * SR))
for i, f in enumerate((523.25, 783.99, 1174.66)):
    s = int(i * .045 * SR); b = tone(f, 2.8, 1.1, .003, ((1, 1), (2.0, .22), (3.01, .08)))
    chord[s:] += b[:len(chord) - s] * (1 - .18 * i)
n = len(chord); t = np.arange(n) / SR
bloom = np.sin(2 * np.pi * 65 * t) * np.minimum(1, t / .02) * np.exp(-t / .5)
st = np.stack([chord, np.roll(chord, int(.008 * SR))], 1)
write('chime', st + .45 * np.stack([bloom, bloom], 1))
