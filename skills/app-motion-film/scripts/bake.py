import cv2, numpy as np, subprocess, sys, json, os
# bake.py <spec.json>: one 60 fps track per screen. Paths in the spec are relative to the spec file.
# segs: {src, at (film s), from (clip s), rate, stop (clip s), xf (dissolve s from the previous seg)}
spec = json.load(open(sys.argv[1])); base = os.path.dirname(os.path.abspath(sys.argv[1])); rel = lambda p: os.path.join(base, p)
W, H, N = spec['w'], spec['h'], round(spec['dur'] * 60)

class Src:
    def __init__(s, path):
        s.path = path; s.still = path.endswith('.png'); s.cache = {}
        if s.still:
            im = cv2.imread(path); s.img = cv2.resize(im, (W, H), interpolation=cv2.INTER_AREA).astype(np.float32); s.n = 1
        else:
            s.v = cv2.VideoCapture(path); s.n = int(s.v.get(cv2.CAP_PROP_FRAME_COUNT)); s.pos = -1
    def frame(s, i):
        if s.still: return s.img
        i = max(0, min(s.n - 1, i))
        if i in s.cache: return s.cache[i]
        if i < s.pos or i > s.pos + 30:
            s.v.set(cv2.CAP_PROP_POS_FRAMES, i); s.pos = i - 1
        while s.pos < i:
            ok, f = s.v.read()
            if not ok: s.n = s.pos + 1; return s.frame(s.n - 1)
            s.pos += 1
            assert f.shape[1] == W and f.shape[0] == H, (s.path, f.shape)
            s.cache[s.pos] = f.astype(np.float32)
        for k in [k for k in s.cache if k < i - 2]: del s.cache[k]
        return s.cache[i]
    def at(s, t):
        x = t * 60; a = int(np.floor(x + 1e-6)); u = x - a
        if u < 1e-3 or s.still: return s.frame(a)
        return s.frame(a) * (1 - u) + s.frame(a + 1) * u

srcs = {k: Src(rel(p)) for k, p in spec['src'].items()}
segs = spec['segs']
def sample(seg, t):
    st = seg['from'] + max(0.0, t - seg['at']) * seg.get('rate', 1)
    if 'stop' in seg: st = min(st, seg['stop'])
    return srcs[seg['src']].at(st)

enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', f'{W}x{H}', '-r', '60', '-i', '-',
    '-c:v', 'libx264', '-crf', '15', '-preset', 'medium', '-g', '30', '-pix_fmt', 'yuv420p', '-r', '60', rel(spec['out'])], stdin=subprocess.PIPE)
for n in range(N):
    t = n / 60
    cur = max([s for s in segs if s['at'] <= t + 1e-9], key=lambda s: s['at'], default=segs[0])
    img = sample(cur, t)
    xf = cur.get('xf', 0); ci = segs.index(cur)
    if xf and ci > 0 and t < cur['at'] + xf:
        u = (t - cur['at']) / xf; u = u * u * (3 - 2 * u)
        img = sample(segs[ci - 1], t) * (1 - u) + img * u
    enc.stdin.write(np.clip(img + .5, 0, 255).astype(np.uint8).tobytes())
enc.stdin.close(); enc.wait()
print('wrote', spec['out'], N, 'frames')
