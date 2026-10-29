"""Measure camera motion in a video and plot it against the song's beats.

Frames are streamed from ffmpeg as raw 128x72 greyscale (never written to disk). For each pair of
consecutive frames a global pan (dx, dy) and zoom (s) are found by exhaustive search + refinement;
the plot shows speed, signed pan X, dolly/zoom rate and raw image change, with beat / downbeat lines
from data/audio.json (or onsets detected from the file's own audio with --onsets).

  uv run python motion.py ../out/clip.mp4 --offset 34.0 --out ../out/motion_clip.png
  uv run python motion.py ref.mp4 --start 33.5 --dur 6 --onsets --out ../out/motion_ref.png

Numbers are approximate (2D global fit on a 3D scene with parallax): compare shapes and timings.
"""
import argparse
import csv
import json
import subprocess
from pathlib import Path

import numpy as np
from scipy.ndimage import map_coordinates

W, H = 128, 72


def find_audio_json() -> str:
    """data/audio.json of the project: searched upward from the current directory."""
    for d in [Path.cwd(), *Path.cwd().parents]:
        if (d / 'data' / 'audio.json').exists():
            return str(d / 'data' / 'audio.json')
    return 'data/audio.json'


def probe(path: str) -> tuple[float, int]:
    out = subprocess.run(
        ['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=r_frame_rate,width',
         '-of', 'json', path], capture_output=True, text=True, check=True).stdout
    st = json.loads(out)['streams'][0]
    num, den = st['r_frame_rate'].split('/')
    return float(num) / float(den), int(st['width'])


def frames(path: str, start: float, dur: float | None):
    cmd = ['ffmpeg', '-v', 'error', '-ss', str(start), '-i', path]
    if dur:
        cmd += ['-t', str(dur)]
    cmd += ['-vf', f'scale={W}:{H}:flags=area,format=gray', '-f', 'rawvideo', '-']
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE)
    n = W * H
    while True:
        buf = p.stdout.read(n)
        if len(buf) < n:
            break
        yield np.frombuffer(buf, np.uint8).reshape(H, W).astype(np.float32)
    p.wait()


ys, xs = np.mgrid[6:H - 6:2, 6:W - 6:2].astype(np.float32)


def err(A, B, dx, dy, s):
    xb = (xs - W / 2) * s + W / 2 + dx
    yb = (ys - H / 2) * s + H / 2 + dy
    b = map_coordinates(B, [yb.ravel(), xb.ravel()], order=1, mode='constant', cval=np.nan)
    a = A[ys.astype(int), xs.astype(int)].ravel()
    ok = ~np.isnan(b)
    return np.abs(a[ok] - b[ok]).mean() if ok.sum() > 200 else 1e9


def fit(A, B):
    best = (1e9, 0.0, 0.0, 1.0)
    for s in (0.9, 0.94, 0.97, 1.0, 1.03, 1.06, 1.1):
        for dy in range(-10, 11, 2):
            for dx in range(-14, 15, 2):
                e = err(A, B, dx, dy, s)
                if e < best[0]:
                    best = (e, dx, dy, s)
    for step, ds in ((0.5, 0.01), (0.125, 0.004)):  # refine: 1/2 then 1/8 of a 128-px cell
        _, bx, by, bs = best
        for s in (bs - ds, bs, bs + ds):
            for dy in np.arange(by - 3 * step, by + 3.01 * step, step):
                for dx in np.arange(bx - 3 * step, bx + 3.01 * step, step):
                    e = err(A, B, dx, dy, s)
                    if e < best[0]:
                        best = (e, dx, dy, s)
    e0, bx, by, bs = best  # sub-step: parabola through the error at ±h on each axis
    h = 0.125

    def vertex(em, ep):
        c = em - 2 * e0 + ep
        return float(np.clip(h * (em - ep) / (2 * c), -h, h)) if c > 1e-9 else 0.0
    bx += vertex(err(A, B, bx - h, by, bs), err(A, B, bx + h, by, bs))
    by += vertex(err(A, B, bx, by - h, bs), err(A, B, bx, by + h, bs))
    return (e0, bx, by, bs)


def file_onsets(path: str, start: float, dur: float | None) -> list[float]:
    import librosa
    cmd = ['ffmpeg', '-v', 'error', '-ss', str(start), '-i', path]
    if dur:
        cmd += ['-t', str(dur)]
    cmd += ['-ac', '1', '-ar', '22050', '-f', 'f32le', '-']
    y = np.frombuffer(subprocess.run(cmd, capture_output=True, check=True).stdout, np.float32)
    return list(librosa.onset.onset_detect(y=y, sr=22050, units='time'))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('video')
    ap.add_argument('--offset', type=float, default=None, help='song time of the first frame of the file (default: --start)')
    ap.add_argument('--start', type=float, default=0.0, help='seconds into the file to start measuring')
    ap.add_argument('--dur', type=float, default=None)
    ap.add_argument('--onsets', action='store_true', help="detect onsets from the file's audio instead of data/audio.json")
    ap.add_argument('--audio-json', default=None, help='default: data/audio.json found upward from cwd')
    ap.add_argument('--out', default=None, help='PNG chart (a CSV with the same stem is written next to it)')
    a = ap.parse_args()
    a.audio_json = a.audio_json or find_audio_json()

    fps, width = probe(a.video)
    px = width / W
    song0 = (a.offset if a.offset is not None else 0.0) + a.start  # song time of the first measured frame

    rows, prev = [], None
    for i, F in enumerate(frames(a.video, a.start, a.dur)):
        if prev is not None:
            e, dx, dy, s = fit(prev, F)
            rows.append({'t': song0 + i / fps, 'dx': dx * px, 'dy': dy * px, 'zoom': float(np.log(s) * 100),
                         'speed': float(np.hypot(dx, dy) * px), 'diff': float(np.abs(prev - F).mean()), 'res': float(e)})
        prev = F
    if not rows:
        raise SystemExit('no frames read')

    beats, downs, onsets = [], [], []
    if a.onsets:
        onsets = [song0 + t for t in file_onsets(a.video, a.start, a.dur)]
    elif Path(a.audio_json).exists():
        au = json.loads(Path(a.audio_json).read_text())
        beats, downs = au['beats'], au['downbeats']

    t0, t1 = rows[0]['t'], rows[-1]['t']
    out = Path(a.out) if a.out else Path(a.video).with_suffix('.motion.png')
    with open(out.with_suffix('.csv'), 'w', newline='') as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)

    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    t = np.array([r['t'] for r in rows])
    lanes = [('speed', 'camera speed px/frame', '#1f9bd1', False), ('dx', 'pan X (signed)', '#2e9e4f', True),
             ('zoom', 'dolly/zoom %/frame (+ = push in)', '#d18a1f', True), ('diff', 'image change', '#c2417a', False)]
    fig, axs = plt.subplots(len(lanes), 1, figsize=(16, 9), sharex=True)
    for ax, (k, label, col, sym) in zip(axs, lanes):
        ax.plot(t, [r[k] for r in rows], color=col, lw=1.8)
        if sym:
            ax.axhline(0, color='#999', lw=0.6)
        ax.set_ylabel(label, fontsize=8)
        for b in beats:
            if t0 <= b <= t1:
                ax.axvline(b, color='#bbb', lw=0.5)
        for d in downs:
            if t0 <= d <= t1:
                ax.axvline(d, color='#555', lw=1.0)
        for o in onsets:
            ax.axvline(o, color='#888', lw=0.6, ls=':')
    axs[-1].set_xlabel('song time (s)  ·  thin = beat, thick = downbeat' + ('  ·  dotted = onset' if onsets else ''))
    fig.suptitle(f'{Path(a.video).name}  {t0:.2f}–{t1:.2f} s  ({fps:.0f} fps)')
    fig.tight_layout()
    fig.savefig(out, dpi=110)
    print(f'{len(rows)} frames  ->  {out}  (+ {out.with_suffix(".csv").name})')


if __name__ == '__main__':
    main()
