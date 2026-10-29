"""Print the timing of a lyric line: each word, its vocal onsets, nearest beat/downbeat, syllable plan.

Use it before staging a line, to see where syllables land and which words are worth a hit.

  uv run python word_onsets.py "open the chat"            # first line containing the text
  uv run python word_onsets.py "ship it" --nth 1           # second occurrence
  uv run python word_onsets.py "anything" --syl ANYTHING=AN,Y,THING

data/lyrics.json and data/audio.json are found upward from the current directory.
"""
import argparse
import json
import re
from pathlib import Path


def find(name: str) -> Path:
    for d in [Path.cwd(), *Path.cwd().parents]:
        if (d / 'data' / name).exists():
            return d / 'data' / name
    raise SystemExit(f'data/{name} not found above {Path.cwd()}')


DIGRAPHS = ('TH', 'SH', 'CH', 'PH', 'WH', 'GH', 'CK', 'NG', 'QU')
ONSETS = {'BL', 'BR', 'CL', 'CR', 'DR', 'FL', 'FR', 'GL', 'GR', 'PL', 'PR', 'SC', 'SK', 'SL', 'SM', 'SN', 'SP', 'ST', 'SW', 'TR', 'TW'}


def syllables(word: str, over: dict[str, list[str]]) -> list[str]:
    """Rough English syllables: digraphs count as one consonant, a cluster between vowels gives its
    longest valid onset to the next syllable (PA-RA-GRAPHS, WRAP-PER), silent final e and a toneless
    -ed stay in the last syllable (ONE, SHIPPED; not TABLE, AUTOMATED). Use --syl for exact splits."""
    w = re.sub(r"[^A-Z'-]", '', word.upper())
    if w in over:
        return over[w]
    if '-' in w:
        return [p for part in w.split('-') if part for p in syllables(part, over)]
    tok, i = [], 0
    while i < len(w):
        n = 2 if w[i:i + 2] in DIGRAPHS else 1
        tok.append(w[i:i + n])
        i += n
    vow = []
    for k, t in enumerate(tok):
        v = t in 'AEIOU' or (t == 'Y' and k > 0 and not vow[-1])
        vow.append(v)
    nuclei = [k for k, v in enumerate(vow) if v and (k == 0 or not vow[k - 1])]
    if len(nuclei) < 2:
        return [w]
    cuts = []
    for a, b in zip(nuclei, nuclei[1:]):
        c0 = a
        while vow[c0]:
            c0 += 1
        cl = tok[c0:b]                      # consonant tokens between two vowel groups
        on = 2 if len(cl) >= 2 and ''.join(cl[-2:]) in ONSETS else min(1, len(cl))
        cuts.append(b - on)
    parts = [''.join(tok[x:y]) for x, y in zip([0] + cuts, cuts + [len(tok)])]
    last = parts[-1].rstrip("'S")
    if (re.fullmatch(r"[^AEIOUY]+E", last) and not re.fullmatch(r"[^AEIOUY]LE", last)) or re.fullmatch(r"[^AEIOUYTD]+ED", last):
        parts[-2:] = [parts[-2] + parts[-1]]
    return parts


def mmss(t: float) -> str:
    return f'{int(t // 60)}:{t % 60:05.2f}'


def nearest(xs: list[float], t: float) -> float:
    return min(xs, key=lambda x: abs(x - t))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('text', help='part of the line text (case-insensitive)')
    ap.add_argument('--nth', type=int, default=0)
    ap.add_argument('--syl', action='append', default=[], help='override, e.g. ANYTHING=AN,Y,THING (repeatable)')
    a = ap.parse_args()
    over = {k.upper(): v.split(',') for k, v in (s.split('=', 1) for s in a.syl)}

    ly = json.loads(find('lyrics.json').read_text())
    au = json.loads(find('audio.json').read_text())
    hits = [l for l in ly['lines'] if a.text.lower() in l['text'].lower()]
    if len(hits) <= a.nth:
        raise SystemExit(f'"{a.text}" #{a.nth} not found ({len(hits)} hits)')
    line = hits[a.nth]
    vocal, kick, snare = au['onsets']['vocal'], au['onsets']['kick'], au['onsets']['snare']
    beats, downs = au['beats'], au['downbeats']
    print(f'line {line["i"]} [{line["section"]}]  {mmss(line["start"])}–{mmss(line["end"])}  "{line["text"]}"')
    print(f'{"word":<14}{"start":>9}{"end":>8}{"conf":>6}  {"beat Δ":>7}{"down Δ":>7}  vocal onsets in word (t:strength)   drums')
    for w in line['words']:
        on = [o for o in vocal if w['start'] - 0.03 <= o[0] <= w['end']]
        dr = [f'K{o[0]:.2f}' for o in kick if abs(o[0] - w['start']) < 0.06] + \
             [f'S{o[0]:.2f}' for o in snare if abs(o[0] - w['start']) < 0.06]
        db, dd = w['start'] - nearest(beats, w['start']), w['start'] - nearest(downs, w['start'])
        print(f'{w["w"]:<14}{w["start"]:>9.3f}{w["end"]:>8.3f}{w["conf"]:>6.2f}  {db:>+7.3f}{dd:>+7.3f}  '
              + ' '.join(f'{t:.3f}:{s:.2f}' for t, s in on) + ('   ' + ' '.join(dr) if dr else ''))
        syl = syllables(w['w'], over)
        if len(syl) > 1:
            inner = sorted([o for o in on if o[0] > w['start'] + 0.06], key=lambda o: -o[1])[:len(syl) - 1]
            if len(inner) == len(syl) - 1:
                ts, src = [w['start']] + sorted(o[0] for o in inner), 'onsets'
            else:
                d = (w['end'] - w['start']) / len(syl)
                ts, src = [w['start'] + j * d for j in range(len(syl))], 'even split'
            print(f'{"":<14}  syllables ({src}): ' + '  '.join(f'{s}@{t:.3f}' for s, t in zip(syl, ts)))
    print('beat Δ / down Δ: word start minus nearest beat / downbeat (|Δ| <= 0.12 -> snap a hit to it)')


if __name__ == '__main__':
    main()
