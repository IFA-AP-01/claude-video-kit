"""script.txt -> analysis/lines.txt (one sentence per line, [section] tags) for the aligner.

    python3 make_lines.py [script.txt]     # no deps; run from anywhere

- `[Tag]` lines in the script start a section; the tag is folded to an ASCII id
  ("[Mở đầu]" -> [mo_dau]) because the id names the scene file `app/src/scenes/<id>.ts`.
- No tags: every paragraph (blank-line separated) becomes a section s1, s2, ...
- Sentences split after . ? ! : … (a line = one caption run and a natural beat boundary).
- Writes the identity map of the ids into config.json "sections" so pron.py keeps them as is
  (otherwise "hook" -> "chorus", etc.).
"""
import json
import re
import sys
import unicodedata
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent


def fold_id(tag: str) -> str:
    s = unicodedata.normalize("NFD", tag).replace("đ", "d").replace("Đ", "D")
    s = "".join(c for c in s if unicodedata.category(c) != "Mn").lower()
    return re.sub(r"[^a-z0-9]+", "_", s).strip("_") or "part"


def sentences(text: str) -> list[str]:
    text = re.sub(r"\s+", " ", text).strip()
    parts = re.split(r"(?<=[.?!:…])\s+(?=\S)", text)
    return [p.strip() for p in parts if p.strip()]


def main():
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "script.txt"
    raw = src.read_text(encoding="utf-8").replace("\r\n", "\n")
    secs: list[tuple[str, list[str]]] = []
    if re.search(r"^\s*\[.+\]\s*$", raw, re.M):
        for ln in raw.split("\n"):
            m = re.fullmatch(r"\s*\[(.+)\]\s*", ln)
            if m:
                secs.append((fold_id(m.group(1)), []))
            elif ln.strip():
                if not secs:
                    secs.append(("intro_text", []))
                secs[-1][1].append(ln)
    else:
        paras = [p for p in re.split(r"\n\s*\n", raw) if p.strip()]
        secs = [(f"s{i + 1}", [p]) for i, p in enumerate(paras)]

    out, ids = [], []
    for sid, chunks in secs:
        lines = sentences(" ".join(chunks))
        if not lines:
            continue
        while sid in ids:      # repeated tag: keep ids unique
            sid += "_b"
        ids.append(sid)
        out += [f"[{sid}]", *lines]
    (HERE / "lines.txt").write_text("\n".join(out) + "\n", encoding="utf-8")

    cfg_f = HERE / "config.json"
    cfg = json.loads(cfg_f.read_text())
    cfg["sections"] = {s: s for s in ids}
    cfg_f.write_text(json.dumps(cfg, ensure_ascii=False, indent=2) + "\n")
    n = sum(1 for x in out if not x.startswith("["))
    print(f"lines.txt: {len(ids)} sections, {n} lines: " + ", ".join(ids))


if __name__ == "__main__":
    main()
