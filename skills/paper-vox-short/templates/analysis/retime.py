"""Map word times onto a tempo-changed voice master without re-aligning.

Only for a tempo change AFTER alignment (normally tempo is applied first, by audio/tempo.py, and
the alignment runs on the final master). audio/tempo.py keeps the 0.25 s head pad and speeds the
rest up with ffmpeg atempo (uniform; checked to within 5 ms across a 2 min file):
    t' = PAD + (t - PAD) / TEMPO

    .venv/bin/python retime.py 1.1 [data/1.0x]   # <src>/words.json (aligned at 1.0x) -> data/words.json
"""
import json
import sys

import soundfile as sf

from common import DATA, ROOT

PAD = 0.25


def main():
    tempo = float(sys.argv[1])
    src = ROOT / sys.argv[2] if len(sys.argv) > 2 else DATA / "1.0x"
    L = json.loads((src / "words.json").read_text())

    def m(t):
        return round(PAD + (t - PAD) / tempo, 3)

    for ln in L["lines"]:
        ln["start"], ln["end"] = m(ln["start"]), m(ln["end"])
        for w in ln["words"]:
            w["start"], w["end"] = m(w["start"]), m(w["end"])
            if "wd" in w:
                w["wd"] = round(w["wd"] / tempo, 3)
    for s in L["sections"] + L["extras"]:
        s["start"], s["end"] = m(s["start"]), m(s["end"])
    L["whisper_bias"] = round(L["whisper_bias"] / tempo, 3)
    L["duration"] = round(sf.info(str(ROOT / "audio/out/voice_master.wav")).duration, 3)
    L["notes"] += f"; retimed from {src.name} for a {tempo}x master (retime.py)"
    (DATA / "words.json").write_text(json.dumps(L, ensure_ascii=False, indent=1))
    print(f"duration {L['duration']}, last word ends {L['lines'][-1]['end']}")


if __name__ == "__main__":
    main()
