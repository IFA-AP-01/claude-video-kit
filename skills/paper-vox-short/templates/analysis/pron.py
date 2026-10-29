"""Lyric parsing and normalisation of display words into aligner tokens (a-z' only).

The MMS_FA aligner only knows the letters a-z and the apostrophe, so every display word is
turned into the way it is *sung*: diacritics stripped (Vietnamese, French, ... -> ASCII),
digits / acronyms spelled out via CONFIG["spoken"] (analysis/config.json).
"""
import re
import unicodedata

from common import CONFIG, LYRICS_TXT

# display word (lowercased, stripped of punctuation) -> spoken form. Extend per song in
# analysis/config.json -> "spoken"; that is also where a "Suno sang it differently" fix goes.
SPOKEN = {
    "ai": "a i", "ai's": "a i s", "api": "a p i", "ui": "u i", "ok": "o k",
    "a.m.": "a m", "a.m": "a m", "p.m.": "p m", "p.m": "p m",
    "0": "zero", "1": "one", "2": "two", "3": "three", "4": "four", "5": "five",
    "6": "six", "7": "seven", "8": "eight", "9": "nine", "10": "ten",
    **{k.lower(): v for k, v in CONFIG["spoken"].items()},
}

# lyric tag (lowercase, number stripped) -> section id base
TAG_BASE = {
    "verse": "verse", "pre-chorus": "pre", "prechorus": "pre", "pre chorus": "pre",
    "chorus": "chorus", "hook": "chorus", "post-chorus": "post", "post chorus": "post",
    "bridge": "bridge", "final chorus": "final", "last chorus": "final",
    "outro": "outro", "spoken outro": "outro", "intro": "intro", "breakdown": "break",
    **{k.lower(): v for k, v in CONFIG["sections"].items()},
}


def _base(tag):
    t = tag.strip().lower()
    if t in TAG_BASE:
        return TAG_BASE[t], None
    m = re.fullmatch(r"(.+?)\s*(\d+)", t)
    if m:
        b = TAG_BASE.get(m.group(1), re.sub(r"[^a-z0-9]+", "_", m.group(1)).strip("_"))
        return b, int(m.group(2))
    return re.sub(r"[^a-z0-9]+", "_", t).strip("_") or "part", None


def parse_lyrics():
    """-> list of sections [{name, tag, lines:[text]}]; tags without lines ([End], [Instrumental]) dropped.

    Ids: "Verse 1" -> verse1, "Pre-Chorus" -> pre1/pre2 (numbered when the tag repeats),
    "Final Chorus" -> final. Lines before the first tag go into "verse".
    """
    secs = []
    for raw in LYRICS_TXT.read_text().splitlines():
        s = raw.strip()
        if not s:
            continue
        m = re.fullmatch(r"\[(.+)\]", s)
        if m:
            secs.append({"tag": m.group(1), "lines": []})
        else:
            if not secs:
                secs.append({"tag": "Verse", "lines": []})
            secs[-1]["lines"].append(s)
    secs = [s for s in secs if s["lines"]]
    bases = [_base(s["tag"]) for s in secs]
    repeats = {b for b, _ in bases if sum(1 for x, _ in bases if x == b) > 1}
    counts, used = {}, set()
    for s, (b, n) in zip(secs, bases):
        if n is None and b in repeats:
            counts[b] = counts.get(b, 0) + 1
            n = counts[b]
        name = f"{b}{n}" if n is not None else b
        while name in used:  # two "[Verse 1]" tags, etc.
            name += "b"
        used.add(name)
        s["name"] = name
    return secs


def display_words(line):
    """Split a lyric line into display words (keeps punctuation attached)."""
    return [w for w in re.split(r"\s+", line) if w and w not in ("—", "–", "-", "...", "…")]


def ascii_fold(s):
    s = s.replace("đ", "d").replace("Đ", "D")
    return "".join(c for c in unicodedata.normalize("NFKD", s) if not unicodedata.combining(c))


def spoken(word):
    """Display word -> list of aligner tokens (may be empty for pure punctuation)."""
    w = word.lower().replace("’", "'").replace('"', "").replace("“", "").replace("”", "")
    w = w.strip(".,!?;:—()[]")
    w = w.lstrip(".")
    if w in SPOKEN:
        return SPOKEN[w].split()
    w = ascii_fold(w)
    if w in SPOKEN:
        return SPOKEN[w].split()
    w = re.sub(r"[^a-z' ]", " ", w.replace("-", " "))
    return [t.strip("'") for t in w.split() if t.strip("'")]
