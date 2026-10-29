"""Phrase captions from data/words.json -> data/captions.json (CaptionItem[] for engine/caption.ts).

Per line: split at punctuation into clauses, then cut each clause into phrases of 3-6 syllables
by dynamic programming. Never cut inside a compound (GLUE), avoid ending a phrase on a function
word, prefer cuts at audible gaps. Number words are shown as digits (NUMERALS).
Per-video glue / numerals / break_before: analysis/caption_rules.json.
"""
import json
import re
import unicodedata

from common import DATA, ROOT
from pron import ascii_fold

# multi-syllable units that must stay on one caption (matched diacritic-insensitively).
# Generic Vietnamese base; per-video compounds go in analysis/caption_rules.json -> "glue".
BASE_GLUE = """vừa qua|chính thức|ra mắt|thế hệ mới|màn trình diễn|mạng xã hội|hoàn toàn|sau đó|nhanh chóng|
nhiều người|cho là|sản phẩm|trí tuệ nhân tạo|tuy nhiên|sự kiện|phát trực tiếp|khán giả|có mặt|thông tin|xác nhận|
người xem|nghi ngờ|người dùng|một số|nền tảng|nội dung|tạo ra|nguyên nhân|tự động|dựa trên|dữ liệu|phần mềm|
để lại|hệ thống|nhận diện|kiểm duyệt|xử lý|trớ trêu thay|có thật|máy móc|đánh giá|vì sao|tại sao|bí mật|nằm ở|
không khí|ra khỏi|áp suất|bên dưới|bên trên|khi đó|bên ngoài|tương tự|nguyên lý|số liệu|hiển thị|vượt quá|lớn hơn|
nhỏ hơn|nhiều lần|trọng lượng|phát triển|ngược lại|công nghệ|sử dụng|chiến thắng|đầu tiên|bị cấm|chuyên gia|
giới chuyên môn|khuyến cáo|thận trọng|xuất hiện|thông số|tăng tốc|kiểm chứng|độc lập|kế hoạch|bắt đầu|sản xuất|
trực tiếp|mặt đất|đoạn video|lượt xem|hàng triệu|hàng chục triệu|hàng tỷ|ki lô gam|ki lô mét|phần trăm|đô la|
việt nam|hoa kỳ|trung quốc|nhật bản|hàn quốc|châu âu|thế giới|con người|thời gian|năm nay|hiện nay|gần đây|
trong khi|thay vì|bởi vì|vì vậy|do đó|nghĩa là|ví dụ|thực tế|thật ra|cuối cùng|đặc biệt|quan trọng|nghiên cứu|
nhà khoa học|công ty|doanh nghiệp|chính phủ|người tiêu dùng|điện thoại|máy tính|xe điện|ô tô|giá trị|lợi nhuận"""

# words that lean on what follows: a phrase should not end on them
LEAN = set("của ở tại là do và các những một bị được sẽ đã mà rồi với cho từ vào lên khi nên lại còn theo hoặc chứ "
           "trong trên dưới bằng nhờ dựa khiến cả cũng vẫn đạt đặt chưa rất thường chỉ lúc khoảng tự".split())

# per-video rules (see BRIEF.md "Captions"):
#   glue          ["thế hệ mới", ...]             extra compounds kept on one caption
#   numerals      [["bốn nghìn bảy trăm ki lô gam", "4.700 kg"], ...]   spoken -> shown as digits
#   break_before  ["hệ thống nhận diện", ...]     a caption must start at these words
_RULES_F = ROOT / "analysis" / "caption_rules.json"
RULES = json.loads(_RULES_F.read_text()) if _RULES_F.exists() else {}
GLUE = "|".join([BASE_GLUE.replace("\n", ""), *RULES.get("glue", [])])
NUMERALS = [tuple(x) for x in RULES.get("numerals", [])]
BREAK_BEFORE = list(RULES.get("break_before", []))

MIN_SYL, MAX_SYL, IDEAL = 3, 6, 4.5
# engine/caption.ts wraps a caption wider than maxW px onto a second line; keep every phrase on one
FONT = json.loads((ROOT / "analysis" / "cap_font_widths.json").read_text())
MAX_PX = FONT["maxW"] - 18  # margin: per-char sums ignore kerning (measured error <= 11 px)
HOLD = 0.35  # keep a caption up this long after its last word, unless the next one starts


def key(w):
    return re.sub(r"[^a-z0-9]", "", ascii_fold(w.lower()))


def px(text):
    """Caption width in px at the engine's caption font (60 px Be Vietnam Pro 800)."""
    W = FONT["widths"]
    return sum(W.get(ch, 40.0) for ch in unicodedata.normalize("NFC", text))


def lean(w):
    """Diacritics matter here: "chưa" leans, "chứa" does not."""
    return w.lower().strip(",.:;?!") in LEAN


def glue_spans(ws):
    """Set of indices i where a cut between word i and i+1 is forbidden."""
    keys = [key(w["w"]) for w in ws]
    nocut = set()
    for g in GLUE.replace("\n", "").split("|"):
        gk = [key(x) for x in g.split()]
        n = len(gk)
        for i in range(len(keys) - n + 1):
            if keys[i:i + n] == gk:
                nocut.update(range(i, i + n - 1))
    return nocut


def weights(ws):
    """Per-word length weight: words of a NUMERALS phrase share the length of its digit form."""
    keys = [key(w["w"]) for w in ws]
    wt = [1.0] * len(ws)
    for a, b in NUMERALS:
        ak = [key(x) for x in a.split()]
        n = len(ak)
        for i in range(len(keys) - n + 1):
            if keys[i:i + n] == ak:
                for k in range(i, i + n):
                    wt[k] = len(b.split()) / n
    return wt


def split_clause(ws, nocut, wt):
    """DP over cut positions; returns list of (a, b) index ranges (b exclusive)."""
    n = len(ws)
    if sum(wt) <= MAX_SYL and px(display(" ".join(w["w"] for w in ws))) <= MAX_PX:
        return [(0, n)]
    keys = [key(w["w"]) for w in ws]
    forced = {i for i in range(1, n) for ph in BREAK_BEFORE
              if keys[i:i + len(ph.split())] == [key(x) for x in ph.split()]}
    INF = float("inf")
    best = [0.0] + [INF] * n
    back = [0] * (n + 1)
    for b in range(1, n + 1):
        for a in range(max(0, b - 16), b):  # spoken words; number phrases are long
            if best[a] == INF or (a > 0 and a - 1 in nocut):
                continue
            L = sum(wt[a:b])
            c = (L - IDEAL) ** 2 * 0.5
            wpx = px(display(" ".join(w["w"] for w in ws[a:b])))
            if wpx > MAX_PX:
                c += 100.0 + (wpx - MAX_PX)  # would wrap: only if nothing else fits
            if L < MIN_SYL:
                c += 6.0
            if L > MAX_SYL:
                c += 4.0 * (L - MAX_SYL)
            if b < n:
                if b - 1 in nocut:
                    continue
                if lean(ws[b - 1]["w"]):
                    c += 10.0
                gap = ws[b]["start"] - ws[b - 1]["end"]
                c -= min(gap, 0.15) * 20  # audible gap -> cheaper cut
                c -= 50.0 * (b in forced)
            if best[a] + c < best[b]:
                best[b], back[b] = best[a] + c, a
    cuts, b = [], n
    while b > 0:
        cuts.append((back[b], b))
        b = back[b]
    return cuts[::-1]


def display(text):
    for a, b in NUMERALS:
        text = re.sub(re.escape(a), b, text, flags=re.I) if a.lower() in text.lower() else text
    return text.rstrip(",.:;").strip()


def main():
    L = json.loads((DATA / "words.json").read_text())
    caps = []
    for ln in L["lines"]:
        ws = ln["words"]
        nocut = glue_spans(ws)
        clauses, a = [], 0
        for i, w in enumerate(ws):
            if re.search(r"[,.:;?!]$", w["w"]) or i == len(ws) - 1:
                clauses.append((a, i + 1))
                a = i + 1
        # a 1-syllable clause (", Mỹ.") joins its neighbour: the previous one at the line end,
        # otherwise the next; the DP then cuts the joined clause where it reads best
        merged = []
        for c in clauses:
            if merged and merged[-1][1] - merged[-1][0] == 1:
                merged[-1] = (merged[-1][0], c[1])
            elif merged and c[1] - c[0] == 1 and c == clauses[-1]:
                merged[-1] = (merged[-1][0], c[1])
            else:
                merged.append(c)
        for ca, cb in merged:
            sub = ws[ca:cb]
            sub_nocut = {i - ca for i in nocut if ca <= i < cb - 1}
            for a, b in split_clause(sub, sub_nocut, weights(sub)):
                part = sub[a:b]
                caps.append({"text": display(" ".join(w["w"] for w in part)), "start": part[0]["start"],
                             "end": part[-1]["end"], "line": ln["i"], "section": ln["section"]})
    for i, c in enumerate(caps):
        nxt = caps[i + 1]["start"] if i + 1 < len(caps) else c["end"] + HOLD
        c["end"] = round(min(c["end"] + HOLD, nxt - 0.02), 3)
    (DATA / "captions.json").write_text(json.dumps(caps, ensure_ascii=False, indent=1))
    lens = [len(c["text"].split()) for c in caps]  # displayed words
    print(f"{len(caps)} captions, syllables min {min(lens)} max {max(lens)}, "
          f"max width {max(px(c['text']) for c in caps):.0f}/{MAX_PX} px")
    for c in caps:
        print(f"  {c['start']:7.2f}-{c['end']:7.2f}  {px(c['text']):4.0f}  {c['text']}")


if __name__ == "__main__":
    main()
