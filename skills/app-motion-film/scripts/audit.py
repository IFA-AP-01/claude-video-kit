import cv2, numpy as np, sys
# audit.py <track.mp4> [...]: frame-to-frame check of a baked track. Exit 1 on frozen frames inside motion.
# Isolated jumps are listed to look at by eye: a tap or slider step in the app is a real one-frame change.
bad = 0
for p in sys.argv[1:]:
    v = cv2.VideoCapture(p); prev = None; d = []
    while True:
        ok, f = v.read()
        if not ok: break
        f = cv2.resize(f, (f.shape[1] // 8, f.shape[0] // 8)).astype(np.float32) / 255
        if prev is not None: d.append(np.abs(f - prev).mean() * 100)
        prev = f
    d = np.array(d); ts = lambda i: round((i + 1) / 60, 3)
    dup = [ts(i) for i in range(1, len(d) - 1) if d[i] < 0.08 and d[i - 1] > 0.4 and d[i + 1] > 0.4]
    jump = [ts(i) for i in range(1, len(d) - 1) if d[i] > 2.5 * max(d[i - 1], d[i + 1]) and d[i] > 0.8]
    print(f'{p.split("/")[-1]}: {len(d) + 1} frames | frozen-in-motion {dup} | jumps to eyeball {jump}')
    bad += len(dup)
sys.exit(1 if bad else 0)
