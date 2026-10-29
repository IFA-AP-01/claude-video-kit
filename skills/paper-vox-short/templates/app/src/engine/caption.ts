// Phrase captions (2–5 words) on hand-cut paper strips in the lower third, inside the Shorts
// safe zone. Be Vietnam Pro 800, ink on white; the key words get a marker swipe. Each wrapped
// line is its own strip (slightly offset/rotated). Captions are camera-locked: add `group` to
// the overlay scene drawn with the pixel camera, not to the parallax world.
import * as THREE from 'three';
import { canvas2d, wrap } from './text';
import { C, CFONT } from './palette';
import { Cutout } from './cutout';
import { hash, stepped } from './rand';
import { SAFE } from './scene';

export interface CaptionItem {
  text: string;
  start: number;
  end: number;
  key?: string;          // substring to highlight
  keyColor?: string;     // marker colour (default yellow)
}

export interface CaptionStyle {
  size?: number;         // font px (default 60)
  maxW?: number;         // max strip text width (default: safe width − 90)
  x?: number;            // block centre (default: safe-zone centre)
  y?: number;            // block centre (default: lower third, above the bottom UI)
  paper?: string;
  ink?: string;
}

const TALL = 'ẤỘỸỜĐÀgjy';

/** Lower-third caption block position: centred in the safe zone, ~160 px above its bottom. */
export const CAPTION_X = (SAFE.left + SAFE.right) / 2;
export const CAPTION_Y = SAFE.bottom + 170;

class Caption {
  readonly group = new THREE.Group();
  readonly lines: Cutout[] = [];

  constructor(readonly item: CaptionItem, st: CaptionStyle, seed: number) {
    const size = st.size ?? 60, padX = 24, padY = 12, lineGap = 6;
    const maxW = st.maxW ?? SAFE.right - SAFE.left - 90;
    const font = `800 ${size}px ${CFONT.cap}`;
    const mg = canvas2d(4, 4).g;
    mg.font = font;
    const tall = mg.measureText(TALL);
    const asc = tall.actualBoundingBoxAscent, desc = tall.actualBoundingBoxDescent;
    const sh = Math.ceil(asc + desc + 2 * padY);
    const text = item.text.trim().replace(/\s+/g, ' ');
    const ls = wrap(mg, text, maxW);
    const ks = item.key ? text.indexOf(item.key) : -1;
    const ke = ks >= 0 ? ks + item.key!.length : -1;

    let off = 0;
    const total = ls.length * sh + (ls.length - 1) * lineGap;
    ls.forEach((line, li) => {
      const lw = Math.ceil(mg.measureText(line).width + 2 * padX);
      const { c, g } = canvas2d(lw, sh);
      g.fillStyle = st.paper ?? C.white;
      g.fillRect(0, 0, lw, sh);
      g.font = font;
      // marker swipe behind the key words on this line
      const a = Math.max(ks, off), b = Math.min(ke, off + line.length);
      if (ks >= 0 && b > a) {
        const x0 = padX + g.measureText(line.slice(0, a - off)).width - 8;
        const x1 = padX + g.measureText(line.slice(0, b - off)).width + 8;
        const y0 = padY + asc * 0.18, y1 = sh - padY * 0.4;
        const j = (n: number) => (hash(seed, li, n) - 0.5) * 8;
        g.fillStyle = item.keyColor ?? C.yellow;
        g.beginPath();
        g.moveTo(x0 + j(1), y0 + j(2));
        g.lineTo(x1 + j(3), y0 + j(4) - 3);
        g.lineTo(x1 + j(5) - 4, y1 + j(6));
        g.lineTo(x0 + j(7) + 3, y1 + j(8) + 2);
        g.closePath();
        g.fill();
      }
      g.fillStyle = st.ink ?? C.ink;
      g.textBaseline = 'alphabetic';
      g.fillText(line, padX, padY + asc);
      const cut = new Cutout(c, { border: 0, torn: 1.8, tornFreq: 1 / 22, paper: st.paper ?? C.white, misreg: 0, rough: 0,
                                  lift: 10, shadow: 0.4, jitter: 1.2, seed: seed * 17 + li });
      const y = total / 2 - sh / 2 - li * (sh + lineGap);
      cut.group.position.set((hash(seed, li, 20) - 0.5) * 30, y, li);
      cut.group.rotation.z = (hash(seed, li, 21) - 0.5) * 0.03;
      this.group.add(cut.group);
      this.lines.push(cut);
      off += line.length + 1;
    });
  }

  update(t: number) {
    const { start, end } = this.item;
    const on = t >= start && t < end;
    this.group.visible = on;
    if (!on) return;
    const a = stepped(t) - start;
    this.group.scale.setScalar(a < 1 / 12 ? 1.12 : a < 2 / 12 ? 0.97 : 1);
    for (const l of this.lines) { l.opacity = 1; l.update(t); }
  }
}

/** A list of timed captions sharing one position + style. */
export class CaptionTrack {
  readonly group = new THREE.Group();
  private caps: Caption[];

  constructor(items: CaptionItem[], st: CaptionStyle = {}) {
    this.caps = items.map((it, i) => new Caption(it, st, 101 + i));
    for (const c of this.caps) this.group.add(c.group);
    this.group.position.set(st.x ?? CAPTION_X, st.y ?? CAPTION_Y, 0);
  }

  update(t: number) { for (const c of this.caps) c.update(t); }
}
