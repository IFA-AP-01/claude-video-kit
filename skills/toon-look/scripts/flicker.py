"""Find toon flicker: flat areas whose tone jumps between two consecutive frames.

A cel / halftone look fails when a large flat area sits near a threshold and flips tone in one frame
(band flip, halftone popping, ink jumping). A pixel is flagged when it is flat (low gradient) in both
frames AND its new tone is not found anywhere within --reach px of it in the previous frame (outside
that neighbourhood's min..max by more than --delta). The reach test is what keeps motion out: a flat
object that slides brings its tone with it, so the tone exists nearby; a band flip creates a tone
that was not there.

Frames are streamed from ffmpeg as raw greyscale (never written to disk), area-downscaled so a
halftone screen averages into its tone (dot popping still shows up as a tone change).

  uv run python flicker.py ../out/clip.mp4 --offset 34.0 --out ../out/flicker.png

Spikes that coincide with an intended cut or flash are expected; check them against the timeline.
"""
import argparse
import csv
import json
from pathlib import Path
import subprocess

import numpy as np
from scipy import ndimage

W, H = 640, 360


def find_audio_json() -> str:
    for d in [Path.cwd(), *Path.cwd().parents]:
        if (d / 'data' / 'audio.json').exists():
            return str(d / 'data' / 'audio.json')
    return 'data/audio.json'


def fps_of(path: str) -> float:
    out = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=r_frame_rate',
                          '-of', 'json', path], capture_output=True, text=True, check=True).stdout
    num, den = json.loads(out)['streams'][0]['r_frame_rate'].split('/')
    return float(num) / float(den)


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


def grad(F):
    # max neighbour difference over a 3x3 window: high near edges, ~0 on flat tone
    g = np.hypot(ndimage.sobel(F, 0), ndimage.sobel(F, 1)) / 8.0
    return ndimage.maximum_filter(g, 3)


def mmss(t: float) -> str:
    return f'{int(t // 60)}:{t % 60:05.2f}'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('video')
    ap.add_argument('--offset', type=float, default=0.0, help='song time of the first frame of the file')
    ap.add_argument('--start', type=float, default=0.0)
    ap.add_argument('--dur', type=float, default=None)
    ap.add_argument('--flat', type=float, default=3.0, help='gradient (levels/px) below which a pixel counts as flat')
    ap.add_argument('--delta', type=float, default=10.0, help='tone change (0-255) that counts as a flip')
    ap.add_argument('--reach', type=int, default=12, help='motion tolerance in px of the 640-wide scan (12 = 36 px at 1080p)')
    ap.add_argument('--cut', type=float, default=35.0, help='mean change above which a frame is treated as a cut/flash')
    ap.add_argument('--top', type=int, default=12)
    ap.add_argument('--audio-json', default=None)
    ap.add_argument('--out', default=None)
    a = ap.parse_args()

    fps = fps_of(a.video)
    song0 = a.offset + a.start
    rows, prev, gprev = [], None, None
    for i, F in enumerate(frames(a.video, a.start, a.dur)):
        F = ndimage.uniform_filter(F, 2)
        g = grad(F)
        if prev is not None:
            d = np.abs(F - prev)
            k = 2 * a.reach + 1
            lo, hi = ndimage.minimum_filter(prev, k), ndimage.maximum_filter(prev, k)
            new = (F < lo - a.delta) | (F > hi + a.delta)
            flag = (g < a.flat) & (gprev < a.flat) & new
            flag = ndimage.binary_opening(flag, iterations=1)  # drop single-pixel noise / compression
            lab, n = ndimage.label(flag)
            blob = float(np.bincount(lab.ravel())[1:].max() / flag.size) if n else 0.0
            rows.append({'t': song0 + i / fps, 'flip': float(flag.mean()), 'blob': blob, 'change': float(d.mean())})
        prev, gprev = F, g
    if not rows:
        raise SystemExit('no frames read')

    out = Path(a.out) if a.out else Path(a.video).with_suffix('.flicker.png')
    with open(out.with_suffix('.csv'), 'w', newline='') as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)

    flip = np.array([r['flip'] for r in rows])
    base = float(np.median(flip))
    hot = flip > max(0.004, 4 * base)
    # group consecutive flagged frames into events:
    #   1 frame  = tone jumped and stayed (a band crossed its threshold in one frame)
    #   2 frames = jumped and came back (classic flicker)
    #   longer   = light/colour changing too fast over several frames
    spikes, i = [], 0
    while i < len(rows):
        if not hot[i]:
            i += 1
            continue
        j = i
        while j + 1 < len(rows) and hot[j + 1]:
            j += 1
        run = rows[i:j + 1]
        peak = max(run, key=lambda r: r['flip'])
        if peak['change'] > a.cut:
            kind = 'cut/flash?'
        else:
            kind = {1: 'one-frame jump', 2: 'flip + back (flicker)'}.get(len(run), f'{len(run)}-frame run')
        spikes.append((peak['flip'], peak, kind))
        i = j + 1
    spikes.sort(key=lambda s: -s[0])
    print(f'{len(rows)} frames, median flagged area {base * 100:.3f}%, {len(spikes)} events')
    for v, r, kind in spikes[:a.top]:
        print(f'  {mmss(r["t"])}  ({r["t"]:.3f}s)  flipped {v * 100:5.2f}% of frame, largest patch {r["blob"] * 100:5.2f}%  [{kind}]')

    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    beats, downs = [], []
    aj = a.audio_json or find_audio_json()
    if Path(aj).exists():
        au = json.loads(Path(aj).read_text())
        beats, downs = au['beats'], au['downbeats']
    t = np.array([r['t'] for r in rows])
    t0, t1 = t[0], t[-1]
    fig, axs = plt.subplots(2, 1, figsize=(16, 6), sharex=True)
    axs[0].plot(t, flip * 100, color='#c2417a', lw=1.6, label='flat area that flipped tone (%)')
    axs[0].plot(t, [r['blob'] * 100 for r in rows], color='#1f9bd1', lw=1.0, label='largest flipped patch (%)')
    for v, r, kind in spikes[:a.top]:
        axs[0].annotate(mmss(r['t']), (r['t'], v * 100), fontsize=7, rotation=60)
    axs[0].legend(fontsize=8, loc='upper right')
    axs[1].plot(t, [r['change'] for r in rows], color='#555', lw=1.2)
    axs[1].axhline(a.cut, color='#d18a1f', lw=0.6, ls='--')
    axs[1].set_ylabel('mean change (cut/flash above dashed)', fontsize=8)
    for ax in axs:
        for b in beats:
            if t0 <= b <= t1:
                ax.axvline(b, color='#ccc', lw=0.5)
        for d in downs:
            if t0 <= d <= t1:
                ax.axvline(d, color='#777', lw=0.9)
    axs[-1].set_xlabel('song time (s)  ·  thin = beat, thick = downbeat')
    fig.suptitle(f'{Path(a.video).name}  flicker scan  {t0:.2f}–{t1:.2f} s  ({fps:.0f} fps)')
    fig.tight_layout()
    fig.savefig(out, dpi=110)
    print(f'-> {out}  (+ {out.with_suffix(".csv").name})')


if __name__ == '__main__':
    main()
