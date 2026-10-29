import cv2, numpy as np, subprocess, sys
# fixdup.py <in.mp4> <out.mp4> [passes]: fills repeated frames inside motion (dropped by simctl, cloned by CFR) with optical flow.
src, out = sys.argv[1], sys.argv[2]; passes = int(sys.argv[3]) if len(sys.argv) > 3 else 3; TH = 0.08
v = cv2.VideoCapture(src); frames = []
while True:
    ok, f = v.read()
    if not ok: break
    frames.append(f)
n = len(frames); H, W = frames[0].shape[:2]
dis = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)
sc = 4
gy, gx = np.mgrid[0:H, 0:W].astype(np.float32)
def flow(A, B):
    g = lambda x: cv2.cvtColor(cv2.resize(x, (W // sc, H // sc), interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2GRAY)
    F = dis.calc(g(A), g(B), None)
    return cv2.resize(F, (W, H), interpolation=cv2.INTER_LINEAR) * sc
def interp(A, B, F, t):
    a = cv2.remap(A, gx - t * F[..., 0], gy - t * F[..., 1], cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    b = cv2.remap(B, gx + (1 - t) * F[..., 0], gy + (1 - t) * F[..., 1], cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    return cv2.addWeighted(a, 1 - t, b, t, 0)
total = 0
for p in range(passes):
    sm = [cv2.resize(f, (W // 8, H // 8)).astype(np.float32) / 255 for f in frames]
    d = [np.abs(sm[i] - sm[i - 1]).mean() * 100 for i in range(1, n)]
    runs, i = [], 0
    while i < len(d):
        if d[i] < TH:
            j = i
            while j + 1 < len(d) and d[j + 1] < TH: j += 1
            if i > 0 and j + 1 < len(d) and d[i - 1] > 0.4 and d[j + 1] > 0.4 and j - i < 3: runs.append((i, j + 2))
            i = j + 1
        else: i += 1
    if not runs: break
    for a, b in runs:
        F = flow(frames[a], frames[b])
        for k in range(a + 1, b): frames[k] = interp(frames[a], frames[b], F, (k - a) / (b - a))
    total += sum(b - a - 1 for a, b in runs)
    print(f'pass {p + 1}: filled {sum(b - a - 1 for a, b in runs)} frames')
enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', f'{W}x{H}', '-r', '60', '-i', '-',
    '-c:v', 'libx264', '-crf', '14', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-r', '60', out], stdin=subprocess.PIPE)
for f in frames: enc.stdin.write(f.tobytes())
enc.stdin.close(); enc.wait()
print(src.split('/')[-1], 'filled', total, 'of', n)
