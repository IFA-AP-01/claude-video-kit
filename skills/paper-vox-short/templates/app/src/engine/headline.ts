// Ransom-note headline: one paper strip per word (Anton on a coloured strip), each a hand-cut
// Cutout with its own slight rotation, laid out in centred lines. Words pop in one at a time
// on the 12 fps stop-motion clock, at the times given by `times` (usually word starts).
import * as THREE from 'three';
import { canvas2d } from './text';
import { C, CFONT } from './palette';
import { Cutout } from './cutout';
import { hash, stepped } from './rand';
import { clamp } from './ease';
import { cue, screenX } from './cues';

export interface Strip { bg: string; fg: string }

export interface HeadlineOpts {
  size?: number;         // font px (default 150)
  strips?: Strip[];      // cycled per word (default white/ink)
  padX?: number;
  padY?: number;
  gap?: number;          // between words
  lineGap?: number;
  rotAmp?: number;       // max rotation per word, degrees (default 3.5)
  seed?: number;
  lift?: number;
}

interface WordPiece { cut: Cutout; x: number; y: number; rot: number }

/** Covers the tallest stacked Vietnamese marks so every strip on a line has the same height. */
const TALL = 'ẤỘỸỜĐÀgjy?!';

export class Headline {
  readonly group = new THREE.Group();
  readonly words: WordPiece[] = [];
  readonly w: number;
  readonly h: number;
  times: number[] = [];

  /** `lines`: words per line, e.g. [['VÌ', 'SAO'], ['KHÔNG', 'RƠI?']]. */
  constructor(lines: string[][], o: HeadlineOpts = {}) {
    const size = o.size ?? 150, padX = o.padX ?? 26, padY = o.padY ?? 12;
    const gap = o.gap ?? 16, lineGap = o.lineGap ?? 12, seed = o.seed ?? 11;
    const strips = o.strips ?? [{ bg: C.white, fg: C.ink }];
    const font = `400 ${size}px ${CFONT.head}`;
    const mg = canvas2d(4, 4).g;
    mg.font = font;
    const tall = mg.measureText(TALL);
    const asc = tall.actualBoundingBoxAscent, desc = tall.actualBoundingBoxDescent;
    const sh = Math.ceil(asc + desc + 2 * padY);

    // measure + build each strip
    let k = 0;
    const rows = lines.map((ws) => ws.map((word) => {
      const wpx = Math.ceil(mg.measureText(word).width + 2 * padX);
      const st = strips[k % strips.length];
      const { c, g } = canvas2d(wpx, sh);
      g.fillStyle = st.bg;
      g.fillRect(0, 0, wpx, sh);
      g.fillStyle = st.fg;
      g.font = font;
      g.textBaseline = 'alphabetic';
      g.fillText(word, padX, padY + asc);
      const cut = new Cutout(c, { border: 0, torn: 2.2, tornFreq: 1 / 26, paper: st.bg, lift: o.lift ?? 14,
                                  jitter: 1.6, seed: seed * 31 + k, paperAmt: 0.16 });
      k++;
      return { cut, wpx };
    }));

    // layout: centred rows, origin = centre of the block
    const rowW = rows.map((r) => r.reduce((s, p) => s + p.wpx, 0) + gap * (r.length - 1));
    this.w = Math.max(...rowW);
    this.h = rows.length * sh + (rows.length - 1) * lineGap;
    const amp = ((o.rotAmp ?? 3.5) * Math.PI) / 180;
    rows.forEach((r, ri) => {
      let x = -rowW[ri] / 2;
      const y = this.h / 2 - sh / 2 - ri * (sh + lineGap);
      for (const p of r) {
        const i = this.words.length;
        const rot = (hash(seed, i, 9) - 0.5) * 2 * amp;
        const dy = (hash(seed, i, 10) - 0.5) * 10;
        const piece = { cut: p.cut, x: x + p.wpx / 2, y: y + dy, rot };
        p.cut.group.position.set(piece.x, piece.y, i * 1.5); // later words on top
        p.cut.group.rotation.z = rot;
        this.group.add(p.cut.group);
        this.words.push(piece);
        x += p.wpx + gap;
      }
    });
  }

  /** Word i appears at times[i]: a 3-step stop-motion pop (big → overshoot → settle). */
  update(t: number, opacity = 1) {
    const ts = stepped(t);
    this.words.forEach((p, i) => {
      const T = this.times[i] ?? 0;
      if (this.times[i] !== undefined) cue('slap', T, { id: p.cut, x: screenX(p.cut.group), gain: 0.85 });
      const a = ts - T;
      const shown = t >= T && opacity > 0.001;
      p.cut.opacity = shown ? opacity : 0;
      // on 12 fps: frame 0 → 1.35×, frame 1 → 0.93×, frame 2 → 1.03×, then 1
      const s = a < 0 ? 1 : a < 1 / 12 ? 1.35 : a < 2 / 12 ? 0.93 : a < 3 / 12 ? 1.03 : 1;
      p.cut.group.scale.setScalar(s);
      p.cut.group.rotation.z = p.rot + (a < 1 / 12 ? 0.08 * (hash(i, 4) - 0.5) : 0) * clamp(1 - a * 12);
      p.cut.update(t);
    });
  }
}
