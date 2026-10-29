// Word-level narration timing over data/words.json (lyric-beat-analysis `lyrics.json` format:
// { lines: [{ i, section, text, start, end, words: [{ w, start, end, conf }] }] }).
// The file is optional: until the alignment exists the app runs every scene on VOICE_DURATION with no captions.
// All queries are pure functions of t.

export interface Word { w: string; start: number; end: number; conf: number; wd?: number }
export interface Line { i: number; section: string; text: string; start: number; end: number; words: Word[] }

interface WordsJson { duration?: number; lines: Line[] }

const files = import.meta.glob<WordsJson>('../../../data/words.json', { eager: true, import: 'default' });
const raw: WordsJson = Object.values(files)[0] ?? { lines: [] };

/** Placeholder voice length (make.sh align writes the real one into words.json); replaced by the aligned file's own duration once it exists. */
export const VOICE_DURATION = 60;

/** Index of the last element <= t (or -1). */
export function bisect(xs: ArrayLike<number>, t: number): number {
  let lo = 0, hi = xs.length;
  while (lo < hi) {
    const m = (lo + hi) >> 1;
    if (xs[m] <= t) lo = m + 1; else hi = m;
  }
  return lo - 1;
}

/** Fold Vietnamese diacritics so `find('vi sao')` matches "Vì sao". */
export const fold = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

export class Words {
  readonly lines: Line[] = raw.lines ?? [];
  readonly duration = raw.duration ?? VOICE_DURATION;
  readonly aligned = this.lines.length > 0;
  private starts = this.lines.map((l) => l.start);

  lineAt(t: number): Line | null {
    const i = bisect(this.starts, t);
    return i < 0 ? null : this.lines[i];
  }

  /** Line being spoken (between its first word start and last word end). */
  activeLine(t: number): Line | null {
    const l = this.lineAt(t);
    return l && t <= l.end ? l : null;
  }

  wordAt(t: number): { line: Line; word: Word; index: number } | null {
    const l = this.activeLine(t);
    if (!l) return null;
    const k = bisect(l.words.map((w) => w.start), t);
    return k < 0 ? null : { line: l, word: l.words[k], index: k };
  }

  /** First line containing `needle` (case- and diacritic-insensitive); nth occurrence. */
  find(needle: string, nth = 0): Line {
    const hits = this.lines.filter((l) => fold(l.text).includes(fold(needle)));
    if (!hits[nth]) throw new Error(`line not found: "${needle}" #${nth}`);
    return hits[nth];
  }

  /** Word in a line by its letters (case/diacritic/punctuation-insensitive), nth occurrence. */
  word(line: Line, needle: string, nth = 0): Word {
    const norm = (x: string) => fold(x).replace(/[^a-z0-9]/g, '');
    const hits = line.words.filter((w) => norm(w.w) === norm(needle));
    if (!hits[nth]) throw new Error(`word "${needle}" #${nth} not in line "${line.text}"`);
    return hits[nth];
  }
}
