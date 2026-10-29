// Word-by-word lyric blocks for 2D canvases (UI surfaces, signs, paper).
// Layout (wrapping, word positions) is measured once at construction; drawing is a pure
// function of t: a word exists from its `start`, pops in over POP s, and the row it sits in
// widens with an expo-out ease, so neighbours slide rather than jump.
import { expoOut, prog } from './ease';
import type { Line } from './lyrics';

export const POP = 0.14;   // word pop-in duration
export const GROW = 0.16;  // row/bubble growth duration

/** Eased 0..1 "this thing has arrived" for an event at `start`. */
export const arrive = (t: number, start: number, dur = GROW) => expoOut(prog(t, start, start + dur));

export interface LyricStyle {
  font: string;          // canvas font, e.g. `800 40px "MV Display"`
  size: number;          // px, for line height / pop pivot
  lineHeight?: number;   // px (default 1.18 × size)
  maxWidth: number;
}

/** Per-word override for keyword gags ("flat" squashed, "sky-high" rising, …). */
export type WordFx = (t: number, k: number) => { sx?: number; sy?: number; dx?: number; dy?: number; color?: string; alpha?: number } | null;

interface Placed { text: string; start: number; x: number; w: number; adv: number; row: number }

export class LyricBlock {
  readonly words: Placed[] = [];
  readonly rows: { width: number; start: number }[] = [];
  readonly lh: number;
  readonly width: number;   // final widest row
  readonly height: number;  // final rows × lh

  constructor(readonly line: Line, readonly st: LyricStyle, measure: CanvasRenderingContext2D, readonly fx?: WordFx) {
    this.lh = st.lineHeight ?? st.size * 1.18;
    measure.save();
    measure.font = st.font;
    const space = measure.measureText(' ').width;
    let x = 0, row = 0;
    line.words.forEach((wd, k) => {
      const w = measure.measureText(wd.w).width;
      if (k > 0 && x + space + w > st.maxWidth) { row++; x = 0; }
      const lead = x > 0 ? space : 0;
      this.words.push({ text: wd.w, start: wd.start, x: x + lead, w, adv: lead + w, row });
      if (!this.rows[row]) this.rows[row] = { width: 0, start: wd.start };
      x += lead + w;
      this.rows[row].width = x;
    });
    measure.restore();
    this.width = Math.max(...this.rows.map((r) => r.width));
    this.height = this.rows.length * this.lh;
  }

  /** Revealed width of row r at t (animated). */
  rowWidth(t: number, r: number): number {
    let w = 0;
    for (const p of this.words) if (p.row === r) w += p.adv * arrive(t, p.start);
    return w;
  }

  /** Animated size of the revealed text (widest row, revealed rows). */
  size(t: number): { w: number; h: number } {
    let w = 0, h = 0;
    this.rows.forEach((row, r) => {
      w = Math.max(w, this.rowWidth(t, r));
      h += this.lh * arrive(t, row.start);
    });
    return { w, h };
  }

  started(t: number) { return t >= this.line.words[0].start; }

  /**
   * Draw at t. (x, y) is the top of the block; `align` picks what x means:
   *  'left'   rows start at x
   *  'right'  each row ends at x (row grows leftwards)
   *  'center' each row centred on x
   *  'block'  rows left-aligned inside a box whose right edge is x (chat bubble)
   */
  draw(g: CanvasRenderingContext2D, t: number, x: number, y: number, color: string,
       align: 'left' | 'right' | 'center' | 'block' = 'left') {
    g.save();
    g.font = this.st.font;
    g.textBaseline = 'middle';
    g.textAlign = 'left';
    const blockW = align === 'block' ? this.size(t).w : 0;
    this.words.forEach((p, k) => {
      if (t < p.start) return;
      const rw = align === 'right' || align === 'center' ? this.rowWidth(t, p.row) : 0;
      const left = align === 'left' ? x : align === 'right' ? x - rw : align === 'center' ? x - rw / 2 : x - blockW;
      const a = prog(t, p.start, p.start + 0.05);
      const s = 0.55 + 0.45 * expoOut(prog(t, p.start, p.start + POP));
      const o = this.fx?.(t, k) ?? null;
      const cx = left + p.x + p.w / 2, cy = y + (p.row + 0.5) * this.lh;
      g.save();
      g.globalAlpha *= a * (o?.alpha ?? 1);
      g.fillStyle = o?.color ?? color;
      g.translate(cx + (o?.dx ?? 0), cy + (o?.dy ?? 0) + (1 - s) * this.st.size * 0.35);
      g.scale(s * (o?.sx ?? 1), s * (o?.sy ?? 1));
      g.fillText(p.text, -p.w / 2, 0);
      g.restore();
    });
    g.restore();
  }
}
