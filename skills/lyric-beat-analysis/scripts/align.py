"""Word-level lyric alignment -> data/lyrics.json.

1. CTC emissions from torchaudio MMS_FA on the vocal stem (20 s chunks with context).
2. One global Viterbi forced alignment over the whole song; a <star> token between
   lines soaks up intros, gaps and ad-libs.
3. Refinement: word starts snap to nearby vocal onsets, word ends extend through
   sustained notes (vocal RMS) but never past the next word.
4. Cross-check with Whisper (work/whisper.json) -> per-word `conf`.
5. Manual fixes from data/lyrics.fix.json.
"""
import difflib
import json

import numpy as np
import torch
import torchaudio
import torchaudio.functional as AF

from common import DATA, WORK, load_stem, round3, write_json
from pron import parse_lyrics, display_words, spoken

SR = 16000
HOP = 0.02  # MMS_FA frame period (s)
CHUNK, CTX = 20.0, 3.0


def emissions(wav):
    cache = WORK / "emission_mms.npy"
    if cache.exists():
        return np.load(cache)
    bundle = torchaudio.pipelines.MMS_FA
    model = bundle.get_model(with_star=True).eval()
    total = len(wav) / SR
    n_frames = int(np.ceil(total / HOP))
    out = None
    t = 0.0
    with torch.inference_mode():
        while t < total:
            a, b = max(0.0, t - CTX), min(total, t + CHUNK + CTX)
            seg = torch.from_numpy(wav[int(a * SR):int(b * SR)]).unsqueeze(0)
            em, _ = model(seg)
            em = em[0].numpy()
            if out is None:
                out = np.full((n_frames, em.shape[1]), -1e4, np.float32)
            f0 = int(round((t - a) / HOP))  # first frame of the kept region in `em`
            keep = int(round(min(CHUNK, total - t) / HOP))
            g0 = int(round(t / HOP))
            k = min(keep, em.shape[0] - f0, n_frames - g0)
            out[g0:g0 + k] = em[f0:f0 + k]
            t += CHUNK
            print(f"  emissions {t:.0f}/{total:.0f}s")
    np.save(cache, out)
    return out


def vocal_features(voc):
    import librosa
    hop = 80  # 5 ms at 16k
    rms = librosa.feature.rms(y=voc, frame_length=640, hop_length=hop)[0]
    onset = librosa.onset.onset_strength(y=voc, sr=SR, hop_length=hop, n_mels=64)
    return rms, onset, hop / SR


def refine(words, rms, onset, fhop):
    """Snap starts to onsets (±40 ms) and extend ends through sustained notes."""
    onn = onset / (np.percentile(onset, 99) + 1e-9)
    for w in words:
        c = int(w["start"] / fhop)
        r = int(0.04 / fhop)
        lo, hi = max(0, c - r), min(len(onn), c + r + 1)
        j = lo + int(np.argmax(onn[lo:hi]))
        if onn[j] > 0.25:
            w["start"] = j * fhop
    for i, w in enumerate(words):
        nxt = words[i + 1]["start"] if i + 1 < len(words) else w["end"] + 1.0
        a, b = int(w["start"] / fhop), int(w["end"] / fhop)
        peak = rms[a:max(b, a + 1)].max()
        k = b
        limit = int(min(nxt, w["end"] + 1.2) / fhop)
        while k < limit and k < len(rms) and rms[k] > 0.35 * peak:
            k += 1
        w["end"] = max(w["end"], k * fhop)
        if nxt > w["start"] + 0.05:
            w["end"] = min(w["end"], nxt - 0.01)
        w["end"] = max(w["end"], w["start"] + 0.06)
        w["end"] = min(w["end"], w["start"] + 2.0)  # no word holds longer than 2 s


def viterbi(em, words, f0, f1, dic):
    """Force-align `words` (each with .tok) inside emission frames [f0,f1).

    A star token surrounds the segment and separates `line_breaks`. Sets start/end/p
    on every word that has tokens. Returns False if the segment is too short.
    """
    star = dic["*"]
    targets, widx = [star], []
    for w in words:
        if w.get("_break"):
            if targets[-1] != star:
                targets.append(star)
            continue
        if not w["tok"]:
            widx.append(None)
            continue
        first = len(targets)
        for tok in w["tok"]:
            targets.extend(dic[ch] for ch in tok)
        widx.append((first, len(targets) - 1))
    if targets[-1] != star:
        targets.append(star)
    if f1 - f0 < len(targets) + 2:
        return False
    ali, scores = AF.forced_align(torch.from_numpy(em[f0:f1]).unsqueeze(0),
                                  torch.tensor([targets], dtype=torch.int32), blank=0)
    ali, scores = ali[0].numpy(), scores[0].exp().numpy()
    # walk the CTC path: a new target starts whenever a non-blank label differs from the
    # previous frame's label (identical consecutive targets are always split by a blank)
    spans = [[None, None, []] for _ in targets]
    ti, prev = -1, 0
    for f, lab in enumerate(ali):
        if lab != 0:
            if lab != prev:
                ti += 1
                assert targets[ti] == lab
            sp = spans[ti]
            sp[0] = f if sp[0] is None else sp[0]
            sp[1] = f
            sp[2].append(scores[f])
        prev = lab
    real = [w for w in words if not w.get("_break")]
    for w, idx in zip(real, widx):
        if idx is None:
            continue
        w["start"] = (f0 + spans[idx[0]][0]) * HOP
        w["end"] = (f0 + spans[idx[1]][1] + 1) * HOP
        sc = [s for k in range(idx[0], idx[1] + 1) for s in spans[k][2]]
        w["p"] = float(np.mean(sc)) if sc else 0.0
    return True


def whisper_words():
    path = WORK / "whisper.json"
    return json.loads(path.read_text())["words"] if path.exists() else []


def match_whisper(flat, ww):
    """Map lyric word index -> whisper word dict via sequence matching of spoken forms."""
    norm = lambda s: "".join(spoken(s))
    sm = difflib.SequenceMatcher(a=[norm(w["w"]) for w in flat], b=[norm(w["w"]) for w in ww],
                                 autojunk=False)
    match, used = {}, set()
    for blk in sm.get_matching_blocks():
        for k in range(blk.size):
            match[blk.a + k] = blk.b + k
            used.add(blk.b + k)
    return match, used


def whisper_line(flat, idx, match, ww, bias):
    """Time the words of one line from whisper; unmatched words are interpolated."""
    known = [(k, ww[match[i]]["start"] - bias, ww[match[i]]["end"] - bias)
             for k, i in enumerate(idx) if i in match]
    ks = [k for k, _, _ in known]
    for k, i in enumerate(idx):
        w = flat[i]
        if i in match:
            w["start"], w["end"] = ww[match[i]]["start"] - bias, ww[match[i]]["end"] - bias
        else:
            w["start"] = float(np.interp(k, ks, [s for _, s, _ in known]))
            w["end"] = w["start"] + 0.2
        w["p"] = 0.3  # whisper-sourced: always flag for a listen


def apply_fixes(lines):
    path = DATA / "lyrics.fix.json"
    if not path.exists():
        return
    fx = json.loads(path.read_text())
    for li, dt in fx.get("shift_line", {}).items():
        for w in lines[int(li)]["words"]:
            w["start"] += dt
            w["end"] += dt
            w["fixed"] = True
    for key, v in fx.get("word", {}).items():
        li, wi = map(int, key.split("."))
        lines[li]["words"][wi].update(v)
        lines[li]["words"][wi]["fixed"] = True


def main():
    secs = parse_lyrics()
    lines = []
    for s in secs:
        for text in s["lines"]:
            lines.append({"section": s["name"], "text": text,
                          "words": [{"w": w, "tok": spoken(w)} for w in display_words(text)]})
    flat = [w for ln in lines for w in ln["words"]]
    line_of = [li for li, ln in enumerate(lines) for _ in ln["words"]]

    voc = load_stem("vocals", SR)
    em = emissions(voc)
    dic = torchaudio.pipelines.MMS_FA.get_dict(star="*")

    # pass 1: one global alignment, star token between lines
    seq = []
    for ln in lines:
        seq.extend(ln["words"])
        seq.append({"_break": True})
    viterbi(em, seq, 0, em.shape[0], dic)

    # whisper cross-check: whisper word starts run early by a roughly constant bias
    ww = whisper_words()
    match, used = match_whisper(flat, ww)

    def deltas(idx):
        return [ww[match[i]]["start"] - flat[i]["start"] for i in idx if i in match and flat[i]["tok"]]

    bias = float(np.median(deltas(range(len(flat))))) if match else 0.0
    print(f"whisper bias {bias*1000:.0f} ms")

    # pass 2: re-align lines that disagree with whisper inside a whisper-derived window
    realigned, from_whisper = [], []
    for li, ln in enumerate(lines):
        idx = [i for i in range(len(flat)) if line_of[i] == li]
        d = deltas(idx)
        hit = [i for i in idx if i in match]
        if len(hit) < max(2, len(idx) // 2):
            continue
        if np.median(np.abs(np.array(d) - bias)) < 0.35:
            continue
        ws, we = ww[match[hit[0]]]["start"] - bias, ww[match[hit[-1]]]["end"] - bias
        # widen for unmatched leading/trailing words (~0.35 s each) plus slack
        ws -= 0.35 * (idx.index(hit[0])) + 0.5
        we += 0.35 * (len(idx) - 1 - idx.index(hit[-1])) + 0.8
        prev_end = max((w["end"] for w in flat[:idx[0]] if w["tok"]), default=0.0)
        nxt = [flat[i]["start"] for i in range(idx[-1] + 1, len(flat)) if flat[i]["tok"]]
        ws = max(ws, prev_end - 0.05)
        we = min(we, nxt[0] + 0.5) if nxt else we
        if viterbi(em, ln["words"], int(ws / HOP), int(we / HOP), dic):
            realigned.append(li)
        # CTC evidence can be too weak in dense, stacked choruses; then trust whisper
        # (bias-corrected) for this line and interpolate the words it did not hear
        d = np.abs(np.array(deltas(idx)) - bias)
        if np.median(d) > 0.35:
            whisper_line(flat, idx, match, ww, bias)
            from_whisper.append(li)
    print(f"realigned lines: {realigned}, whisper-timed lines: {from_whisper}")

    # punctuation-only display words inherit neighbours
    for i, w in enumerate(flat):
        if not w["tok"]:
            prevw = next((flat[j] for j in range(i - 1, -1, -1) if flat[j]["tok"]), None)
            w["start"] = w["end"] = prevw["end"] if prevw else 0.0
            w["p"] = 1.0

    rms, onset, fhop = vocal_features(voc)
    timed = sorted([w for w in flat if w["tok"]], key=lambda w: w["start"])
    refine(timed, rms, onset, fhop)

    # conf: mostly whisper agreement (independent model), a little CTC posterior.
    # Words whisper did not hear borrow 80% of their line's agreement.
    for i, w in enumerate(flat):
        if i in match:
            d = ww[match[i]]["start"] - w["start"] - bias
            w["wag"] = 1.0 if abs(d) < 0.25 else max(0.0, 1.0 - (abs(d) - 0.25) / 0.5)
            w["wd"] = round3(d)
    for li in range(len(lines)):
        idx = [i for i in range(len(flat)) if line_of[i] == li]
        known = [flat[i]["wag"] for i in idx if "wag" in flat[i]]
        fill = 0.8 * float(np.mean(known)) if known else 0.4
        for i in idx:
            w = flat[i]
            w["conf"] = round3(0.75 * w.get("wag", fill) + 0.25 * min(1.0, w["p"] / 0.3))
            if li in from_whisper:
                w["conf"] = min(w["conf"], 0.55)

    # sung material whisper heard that is not on the lyric sheet (tags, repeats, ad-libs)
    extras, run = [], []
    for j, w in enumerate(ww + [None]):
        if w is not None and j not in used:
            run.append(w)
            continue
        if len(run) >= 2:
            extras.append({"start": round3(run[0]["start"] - bias), "end": round3(run[-1]["end"] - bias),
                           "text": " ".join(x["w"] for x in run)})
        run = []

    apply_fixes(lines)

    out_lines = []
    for i, ln in enumerate(lines):
        ws = []
        for w in ln["words"]:
            o = {"w": w["w"], "start": round3(w["start"]), "end": round3(w["end"]),
                 "conf": 1.0 if w.get("fixed") else w["conf"]}
            if "wd" in w:
                o["wd"] = w["wd"]
            ws.append(o)
        out_lines.append({"i": i, "section": ln["section"], "text": ln["text"],
                          "start": ws[0]["start"], "end": ws[-1]["end"], "words": ws})
    sections = []
    for ln in out_lines:
        if not sections or sections[-1]["name"] != ln["section"]:
            sections.append({"name": ln["section"], "start": ln["start"], "end": ln["end"]})
        sections[-1]["end"] = ln["end"]
    write_json(DATA / "lyrics.json", {
        "lines": out_lines, "sections": sections, "extras": extras,
        "whisper_bias": round3(bias), "realigned": realigned,
        "notes": "word times in song.mp3 seconds; conf in [0,1]; wd = whisper start - start - bias"})
    low = sum(1 for ln in out_lines for w in ln["words"] if w["conf"] < 0.6)
    print(f"{len(out_lines)} lines, {len(flat)} words, {low} low-confidence, {len(extras)} extras")


if __name__ == "__main__":
    main()
