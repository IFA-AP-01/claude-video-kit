// Word-level lyric lookups over data/lyrics.json.
import raw from '../../../data/lyrics.json';
import { bisect } from './audio';

export interface Word { w: string; start: number; end: number; conf: number; wd?: number }
export interface Line { i: number; section: string; text: string; start: number; end: number; words: Word[] }
export interface Extra { start: number; end: number; text: string }

interface LyricsJson { lines: Line[]; extras: Extra[]; sections: { name: string; start: number; end: number }[] }

export class Lyrics {
  readonly d = raw as unknown as LyricsJson;
  readonly lines = this.d.lines;
  readonly extras = this.d.extras;
  private starts = this.lines.map((l) => l.start);

  /** Line whose [start, nextStart) contains t, or null before the first line. */
  lineAt(t: number): Line | null {
    const i = bisect(this.starts, t);
    return i < 0 ? null : this.lines[i];
  }

  /** Line being sung right now (between its first word start and last word end). */
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

  /** First line whose text contains `needle` (case-insensitive); nth occurrence (0-based). */
  find(needle: string, nth = 0): Line {
    const hits = this.lines.filter((l) => l.text.toLowerCase().includes(needle.toLowerCase()));
    if (!hits[nth]) throw new Error(`lyric not found: "${needle}" #${nth}`);
    return hits[nth];
  }

  /** Word in a line by its letters (case/punctuation-insensitive), nth occurrence. */
  word(line: Line, needle: string, nth = 0): Word {
    const norm = (x: string) => x.toLowerCase().replace(/[^a-z0-9']/g, '');
    const hits = line.words.filter((w) => norm(w.w) === norm(needle));
    if (!hits[nth]) throw new Error(`word "${needle}" #${nth} not in line "${line.text}"`);
    return hits[nth];
  }

  linesIn(section: string): Line[] {
    return this.lines.filter((l) => l.section === section);
  }
}
