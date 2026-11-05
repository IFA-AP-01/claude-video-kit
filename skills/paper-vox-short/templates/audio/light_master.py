"""Light master: keeps a good TTS read as it is. Static gain to the loudness target,
true-peak limiter, 48 kHz / 24-bit, 0.25 s head pad (same framing as master.py). No EQ, no
compressor, no de-ess, no adeclick (declick.py repairs clicks before this): on premium TTS every extra stage sounded worse than the original.

  .venv/bin/python light_master.py <in> <out.wav> [--loudness -14]
"""

import argparse
import json
import subprocess


def measure(src, chain, loudness):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", src, "-af",
                        f"{chain},loudnorm=I={loudness}:TP=-1.0:LRA=11:print_format=json", "-f", "null", "-"],
                       capture_output=True, text=True)
    t = r.stderr
    return json.loads(t[t.rindex("{"): t.rindex("}") + 1])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("dst")
    ap.add_argument("--loudness", type=float, default=-14.0)
    ap.add_argument("--tone", default="", help="optional ffmpeg tone chain (denoise/EQ) before the gain")
    a = ap.parse_args()

    pre = "aresample=48000:resampler=soxr:precision=28,adelay=250:all=1,apad=pad_dur=0.5"
    if a.tone:
        pre = f"{a.tone},{pre}"
    m = measure(a.src, pre, a.loudness)
    gain = a.loudness - float(m["input_i"])
    chain = (f"{pre},volume={gain:.2f}dB,aresample=192000,"
             "alimiter=limit=0.84:attack=5:release=120:level=false:asc=1,aresample=48000")
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", a.src, "-af", chain,
                    "-ac", "1", "-ar", "48000", "-c:a", "pcm_s24le", a.dst], check=True)
    m2 = measure(a.dst, "anull", a.loudness)
    print(f"  light master: gain {gain:+.1f} dB -> {float(m2['input_i']):.1f} LUFS, TP {float(m2['input_tp']):.1f} dBTP")


if __name__ == "__main__":
    main()
