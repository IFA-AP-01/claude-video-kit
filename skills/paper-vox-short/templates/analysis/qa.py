"""Narration QA: data/qa_report.md + work/qa_<nn>.png (waveform with word spans, 15 s per plot)."""
import json

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

from common import DATA, WORK, load_stem

LOW = 0.6
WIN = 15.0


def mmss(t):
    return f"{int(t // 60)}:{t % 60:05.2f}"


def main():
    L = json.loads((DATA / "words.json").read_text())
    lines = L["lines"]
    flat = [(ln["i"], wi, w) for ln in lines for wi, w in enumerate(ln["words"])]
    out = ["# QA report — narration alignment", "",
           f"- duration **{L['duration']} s**, {len(lines)} lines, {len(flat)} words; "
           f"whisper bias {L['whisper_bias'] * 1000:.0f} ms; re-aligned lines {L['realigned']}", "",
           f"## Words to listen to (conf < {LOW})", "", "Key `line.word` is what `data/lyrics.fix.json` uses.", "",
           "| key | time | word | conf | whisper Δ |", "|---|---|---|---|---|"]
    out += [f"| {li}.{wi} | {mmss(w['start'])} | {w['w']} | {w['conf']:.2f} | {w.get('wd', '—')} |"
            for li, wi, w in flat if w["conf"] < LOW]
    out += ["", "## Suspicious durations (< 70 ms or > 0.9 s) and overlaps", ""]
    for k, (li, wi, w) in enumerate(flat):
        d = w["end"] - w["start"]
        if d < 0.07 or d > 0.9:
            out.append(f"- {li}.{wi} `{w['w']}` {mmss(w['start'])} dur {d * 1000:.0f} ms")
        if k and w["start"] < flat[k - 1][2]["start"]:
            out.append(f"- {li}.{wi} `{w['w']}` starts before previous word")
    out += ["", "## Heard by whisper, not in the script", ""]
    out += [f"- {mmss(e['start'])}–{mmss(e['end'])}: “{e['text']}”" for e in L["extras"]]
    out += ["", "## Line timing (pause = silence before the line)", "",
            "| # | section | start | end | pause | text |", "|---|---|---|---|---|---|"]
    for k, ln in enumerate(lines):
        gap = ln["start"] - lines[k - 1]["end"] if k else ln["start"]
        out.append(f"| {ln['i']} | {ln['section']} | {mmss(ln['start'])} | {mmss(ln['end'])} | "
                   f"{gap:.2f} | {ln['text']} |")
    (DATA / "qa_report.md").write_text("\n".join(out) + "\n")

    sr = 8000
    voc = load_stem("vocals", sr)
    for n, a in enumerate(np.arange(0, L["duration"], WIN)):
        b = a + WIN
        fig, ax = plt.subplots(figsize=(24, 3.2))
        seg = voc[int(a * sr):int(b * sr)]
        ax.plot(np.arange(len(seg)) / sr + a, seg, lw=0.3, color="0.5")
        for li, wi, w in flat:
            if a <= w["start"] <= b:
                c = "tab:red" if w["conf"] < LOW else "tab:green"
                ax.axvspan(w["start"], w["end"], 0.0, 0.08, color=c, alpha=0.6)
                ax.axvline(w["start"], color=c, lw=0.4, alpha=0.5)
                ax.text(w["start"], 0.95, w["w"], fontsize=7, rotation=90, va="top",
                        transform=ax.get_xaxis_transform())
        ax.set_xlim(a, b)
        fig.tight_layout()
        fig.savefig(WORK / f"qa_{n:02d}.png", dpi=70)
        plt.close(fig)
    print("wrote data/qa_report.md and work/qa_*.png")


if __name__ == "__main__":
    main()
