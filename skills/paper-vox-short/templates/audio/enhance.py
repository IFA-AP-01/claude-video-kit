"""AI bandwidth extension for the TTS voice (24 kHz / 32 kbps MP3 -> 44.1 kHz full band).

Uses Resemble Enhance (enhancer_stage2) for inference only. The package imports
deepspeed at module level for training code we never call, so it is stubbed out.

usage: nice -n 10 .venv/bin/python enhance.py [in] [out] [--lambd 0.1] [--tau 0.5] [--nfe 64] [--threads 4] [--only N]
CPU only, processed in <=12 s pieces split at silent gaps, each piece cached in out/chunks/.
"""

import argparse
import hashlib
import sys
import types
from pathlib import Path

HERE = Path(__file__).resolve().parent

# --- stub deepspeed (training-only dependency) ---------------------------------
import importlib.abc  # noqa: E402
import importlib.machinery  # noqa: E402


class _Stub(types.ModuleType):
    __path__: list = []

    def __getattr__(self, name):
        if name.startswith("__"):
            raise AttributeError(name)
        return type(name, (), {"__init__": lambda self, *a, **k: None})


class _StubFinder(importlib.abc.MetaPathFinder, importlib.abc.Loader):
    def find_spec(self, fullname, path, target=None):
        if fullname == "deepspeed" or fullname.startswith("deepspeed."):
            return importlib.machinery.ModuleSpec(fullname, self, is_package=True)
        return None

    def create_module(self, spec):
        return _Stub(spec.name)

    def exec_module(self, module):
        pass


sys.meta_path.insert(0, _StubFinder())

import librosa  # noqa: E402
import numpy as np  # noqa: E402
import soundfile as sf  # noqa: E402
import torch  # noqa: E402

from resemble_enhance.enhancer.inference import enhance  # noqa: E402

MODEL_DIR = HERE / "models" / "resemble-enhance" / "enhancer_stage2"
SR = 44100


def split_points(y: np.ndarray, max_len: float, min_gap: float = 0.2) -> list[tuple[int, int]]:
    """Cut at the middle of silent gaps (source has digital silence) into pieces <= max_len s."""
    silent = np.abs(y) < 1e-4
    # gap centers: runs of silence >= min_gap
    centers, i, n = [], 0, len(y)
    while i < n:
        if silent[i]:
            j = i
            while j < n and silent[j]:
                j += 1
            if j - i >= min_gap * SR:
                centers.append((i + j) // 2)
            i = j
        else:
            i += 1
    cuts, last = [0], 0
    for k, c in enumerate(centers):
        nxt = centers[k + 1] if k + 1 < len(centers) else n
        if nxt - last > max_len * SR and c > last:
            cuts.append(c)
            last = c
    cuts.append(n)
    return [(a, b) for a, b in zip(cuts[:-1], cuts[1:]) if b > a]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("src", nargs="?", default=str(HERE.parent / "voice.mp3"))
    ap.add_argument("dst", nargs="?", default=str(HERE / "out" / "voice_enhanced.wav"))
    ap.add_argument("--lambd", type=float, default=0.1, help="denoise strength 0..1 (source is clean TTS)")
    ap.add_argument("--tau", type=float, default=0.5, help="CFM prior temperature 0..1")
    ap.add_argument("--nfe", type=int, default=64, help="ODE steps (quality vs speed)")
    ap.add_argument("--threads", type=int, default=4)
    ap.add_argument("--max-len", type=float, default=12.0, help="max seconds per piece")
    ap.add_argument("--only", type=int, default=None, help="process just piece N (test)")
    ap.add_argument("--seed", type=int, default=1234)
    a = ap.parse_args()

    # CPU only: MPS run hung the GPU and triggered a hardware watchdog reset.
    torch.set_num_threads(a.threads)
    torch.set_num_interop_threads(1)
    device = "cpu"

    y, _ = librosa.load(a.src, sr=SR, mono=True)  # soxr_hq resample 24k -> 44.1k
    pieces = split_points(y, a.max_len)
    cache = Path(a.dst).parent / "chunks"
    cache.mkdir(parents=True, exist_ok=True)
    tag = f"l{a.lambd}_t{a.tau}_n{a.nfe}"
    print(f"in: {a.src}  {len(y) / SR:.2f}s  {len(pieces)} pieces  threads={a.threads}")

    out = np.zeros_like(y)
    for k, (s0, s1) in enumerate(pieces):
        if a.only is not None and k != a.only:
            continue
        # keyed by the piece's own samples: an edited voice (splice, closed gap) never reuses stale audio
        digest = hashlib.sha1(y[s0:s1].tobytes()).hexdigest()[:10]
        f = cache / f"{k:03d}_{tag}_{digest}.wav"
        if f.exists():
            h, _ = sf.read(f, dtype="float32")
        else:
            torch.manual_seed(a.seed + k)
            seg = torch.from_numpy(y[s0:s1].copy()).float()
            h, out_sr = enhance(seg, SR, device, nfe=a.nfe, solver="midpoint", lambd=a.lambd, tau=a.tau, run_dir=MODEL_DIR)
            assert out_sr == SR, out_sr
            h = h.numpy().astype(np.float32)[: s1 - s0]
            sf.write(f, h, SR, subtype="FLOAT")
        out[s0 : s0 + len(h)] = h
        print(f"  piece {k + 1}/{len(pieces)}  {s0 / SR:6.2f}-{s1 / SR:6.2f}s  done", flush=True)

    if a.only is not None:
        return
    Path(a.dst).parent.mkdir(parents=True, exist_ok=True)
    sf.write(a.dst, out, SR, subtype="FLOAT")
    print(f"out: {a.dst}  {len(out) / SR:.2f}s")


if __name__ == "__main__":
    main()
