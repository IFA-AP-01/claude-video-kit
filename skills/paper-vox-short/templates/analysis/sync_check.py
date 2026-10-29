"""Timing check video: phrase captions + the word being spoken, over the master voice.

    .venv/bin/python sync_check.py  ->  out/sync_check.mp4 (540x960, ffmpeg + libass only, CPU-light)
"""
import json
import subprocess

from common import DATA, ROOT, WORK


def ts(t):
    t = max(0.0, t)
    return f"{int(t // 3600)}:{int(t % 3600 // 60):02d}:{t % 60:05.2f}"


def main():
    W = json.loads((DATA / "words.json").read_text())
    C = json.loads((DATA / "captions.json").read_text())
    head = """[Script Info]
ScriptType: v4.00+
PlayResX: 540
PlayResY: 960

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,Arial,40,&H001A1A1A,&H001A1A1A,&H00FFFFFF,&H00FFFFFF,1,0,0,0,100,100,0,0,3,10,0,2,40,90,220,1
Style: Word,Arial,30,&H0030C2F2,&H0030C2F2,&H00000000,&H00000000,1,0,0,0,100,100,0,0,1,3,0,8,30,30,140,1
Style: Info,Arial,20,&H00DBEAF2,&H00DBEAF2,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,2,0,7,20,20,20,1
Style: Line,Arial,22,&H00DBEAF2,&H00DBEAF2,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,2,0,8,40,40,330,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    ev = []
    for c in C:
        ev.append(f"Dialogue: 0,{ts(c['start'])},{ts(c['end'])},Cap,,0,0,0,,{c['text']}")
    for ln in W["lines"]:
        ev.append(f"Dialogue: 0,{ts(ln['start'])},{ts(ln['end'])},Line,,0,0,0,,[{ln['section']} #{ln['i']}]\\N{ln['text']}")
        for k, w in enumerate(ln["words"]):
            end = ln["words"][k + 1]["start"] if k + 1 < len(ln["words"]) else w["end"]
            col = "" if w["conf"] >= 0.6 else "{\\c&H004040FF&}"
            ev.append(f"Dialogue: 1,{ts(w['start'])},{ts(max(end, w['start'] + 0.05))},Word,,0,0,0,,{col}{w['w']}")
    ass = WORK / "sync.ass"
    ass.write_text(head + "\n".join(ev) + "\n")
    out = ROOT / "out" / "sync_check.mp4"
    dur = W["duration"]
    vf = (f"subtitles={ass.name}:fontsdir=/System/Library/Fonts/Supplemental,"
          f"drawtext=fontfile=/System/Library/Fonts/Supplemental/Arial.ttf:fontsize=20:fontcolor=0xF2EADB:"
          f"x=20:y=20:text='%{{pts\\:hms}}'")
    subprocess.run(["nice", "-n", "10", "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
                    "-f", "lavfi", "-i", f"color=c=0x2F5BEA:s=540x960:r=30:d={dur}",
                    "-i", str(ROOT / "audio/out/voice_master.wav"),
                    "-vf", vf, "-c:v", "libx264", "-preset", "veryfast", "-crf", "26", "-threads", "4",
                    "-c:a", "aac", "-b:a", "160k", "-shortest", str(out)], check=True, cwd=WORK)
    print(f"wrote {out.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
