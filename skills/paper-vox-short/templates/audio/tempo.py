"""Speed up (or slow down) the mastered voice, keeping the 0.25 s head pad master.py adds, and
add the end-card hold (digital silence after the last word; the video lasts as long as the voice).

    .venv/bin/python tempo.py 1.1 --hold 1.5   # out/1.0x/voice_master.wav -> out/voice_master.wav

master.py writes the untouched master to out/1.0x/ (make.sh voice); this always rebuilds the final
one from it, so re-running never stacks tempo or hold.

Run it BEFORE the alignment (make.sh voice does): words.json is then measured on the final voice
and nothing needs retiming. Pitch is unchanged (ffmpeg atempo) unless --pitch is given (rubberband, formants preserved). Loudness is re-checked; atempo
barely moves it (<0.2 LU).
"""
import argparse
import subprocess
from pathlib import Path

HERE = Path(__file__).resolve().parent
PAD = 0.25


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("tempo", type=float)
    ap.add_argument("--hold", type=float, default=0.0, help="seconds of silence added at the end")
    ap.add_argument("--pitch", type=float, default=0.0, help="semitones up (+) or down (-), formants kept")
    a = ap.parse_args()
    tempo = a.tempo
    master = HERE / "out" / "voice_master.wav"
    keep = HERE / "out" / "1.0x" / "voice_master.wav"
    stretch = (f"rubberband=tempo={tempo}:pitch={2 ** (a.pitch / 12):.5f}:formant=preserved:pitchq=quality"
               if a.pitch else (f"atempo={tempo}" if tempo != 1 else "anull"))
    # pad untouched, the rest through atempo (0.5..2.0 per stage)
    flt = (f"[0:a]atrim=0:{PAD},asetpts=PTS-STARTPTS[a];"
           f"[0:a]atrim={PAD},asetpts=PTS-STARTPTS,{stretch}[b];[a][b]concat=n=2:v=0:a=1,"
           f"apad=pad_dur={a.hold}")
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(keep),
                    "-filter_complex", flt, "-ar", "48000", "-c:a", "pcm_s24le", str(master)], check=True)
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0",
                        str(master)], capture_output=True, text=True).stdout.strip()
    print(f"voice_master.wav at {tempo}x, pitch {a.pitch:+} st + {a.hold} s hold: {float(r):.2f} s ")


if __name__ == "__main__":
    main()
