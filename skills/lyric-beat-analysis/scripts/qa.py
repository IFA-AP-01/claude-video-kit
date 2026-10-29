"""QA report (data/qa_report.md) and per-section alignment plots (work/qa_<section>.png)."""
import json

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

from common import DATA, WORK, load_stem

LOW = 0.6


def mmss(t):
    return f"{int(t // 60)}:{t % 60:05.2f}"


def main():
    L = json.loads((DATA / "lyrics.json").read_text())
    A = json.loads((DATA / "audio.json").read_text())
    dbg = json.loads((WORK / "analyze_debug.json").read_text())
    out = ["# QA report", ""]
    out += [f"- duration **{A['duration']} s**, tempo **{A['bpm']} bpm** "
            f"(beat {A['beat_period']*1000:.1f} ms, grid jitter {A['grid_jitter']*1000:.1f} ms), "
            f"downbeat phase {A['downbeat_phase']}",
            f"- {len(L['lines'])} lines, {sum(len(l['words']) for l in L['lines'])} words; "
            f"whisper bias {L['whisper_bias']*1000:.0f} ms; re-aligned lines {L['realigned']}", ""]
    out += ["## Sections (audio.json, snapped to downbeats)", "",
            "| section | start | end | bars | first sung word | pickup (beats, + = sung before boundary) |", "|---|---|---|---|---|---|"]
    sung = {s["name"]: s["start"] for s in L["sections"]}
    for s in A["sections"]:
        bars = (s["end"] - s["start"]) / (A["beat_period"] * A["time_signature"])
        if s["name"] in sung:
            first = f"{mmss(sung[s['name']])} | {(s['start'] - sung[s['name']]) / A['beat_period']:+.1f}"
        else:
            first = "— | —"
        out.append(f"| {s['name']} | {mmss(s['start'])} | {mmss(s['end'])} | {bars:.1f} | {first} |")
    out += ["", f"Novelty boundaries (librosa, for comparison): "
            + ", ".join(mmss(t) for t in dbg["novelty"]), ""]
    for s in dbg["sections_sung"]:
        if not s["phrase"]:
            out.append(f"- ⚠ `{s['name']}` does not sit on a 4-bar phrase; snapped to nearest downbeat")
    out += ["", f"## Words to listen to (conf < {LOW})", "",
            "Key `line.word` is what `data/lyrics.fix.json` uses.", "",
            "| key | time | word | line | conf | whisper Δ |", "|---|---|---|---|---|---|"]
    for ln in L["lines"]:
        for wi, w in enumerate(ln["words"]):
            if w["conf"] < LOW:
                out.append(f"| {ln['i']}.{wi} | {mmss(w['start'])} | {w['w']} | {ln['text']} | "
                           f"{w['conf']:.2f} | {w.get('wd', '—')} |")
    out += ["", "## Sung but not on the lyric sheet (heard by whisper)", ""]
    out += [f"- {mmss(e['start'])}–{mmss(e['end'])}: “{e['text']}”" for e in L["extras"]]
    out += ["", "## Line timing", "", "| # | section | start | end | text |", "|---|---|---|---|---|"]
    out += [f"| {l['i']} | {l['section']} | {mmss(l['start'])} | {mmss(l['end'])} | {l['text']} |"
            for l in L["lines"]]
    (DATA / "qa_report.md").write_text("\n".join(out) + "\n")

    sr = 8000
    voc = load_stem("vocals", sr)
    for s in A["sections"]:
        a, b = s["start"], s["end"]
        fig, ax = plt.subplots(figsize=(22, 3.2))
        seg = voc[int(a * sr):int(b * sr)]
        ax.plot(np.arange(len(seg)) / sr + a, seg, lw=0.3, color="0.5")
        for t in A["beats"]:
            if a <= t <= b:
                ax.axvline(t, color="0.85", lw=0.5, zorder=0)
        for t in A["downbeats"]:
            if a <= t <= b:
                ax.axvline(t, color="tab:blue", lw=0.8, zorder=0)
        for ln in L["lines"]:
            for w in ln["words"]:
                if a <= w["start"] <= b:
                    c = "tab:red" if w["conf"] < LOW else "tab:green"
                    ax.axvspan(w["start"], w["end"], 0.0, 0.08, color=c, alpha=0.6)
                    ax.text(w["start"], 0.9, w["w"], fontsize=7, rotation=90, va="top",
                            transform=ax.get_xaxis_transform())
        ax.set_xlim(a, b)
        ax.set_title(s["name"])
        fig.tight_layout()
        fig.savefig(WORK / f"qa_{s['name']}.png", dpi=80)
        plt.close(fig)
    print("wrote data/qa_report.md and work/qa_*.png")


if __name__ == "__main__":
    main()
