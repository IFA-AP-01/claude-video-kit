// Generic canvas art shared by the beat scenes: halftone disc, round sticker, label tag, arrow,
// flat plane, plus paper props (heart, speech bubble, phone, smoke puff, crowd, map pin) and
// halftone photo prints. Everything is drawn once in init(); nothing here depends on t.
import * as THREE from 'three';
import { canvas2d, wrap } from './text';
import { C, CFONT } from './palette';
import { Cutout, type CutoutOpts } from './cutout';
import type { HalftoneOpts } from './halftone';
import { hash } from './rand';

type Img = CanvasImageSource & { width: number; height: number };

/** Disc with a radial tone ramp, made for the halftone shader (light centre, dark rim). */
export function discCanvas(d = 900) {
  const { c, g } = canvas2d(d, d);
  const gr = g.createRadialGradient(d * 0.42, d * 0.4, d * 0.05, d / 2, d / 2, d / 2);
  gr.addColorStop(0, '#f4f4f4');
  gr.addColorStop(0.6, '#a8a8a8');
  gr.addColorStop(1, '#5a5a5a');
  g.fillStyle = gr;
  g.beginPath(); g.arc(d / 2, d / 2, d / 2 - 2, 0, Math.PI * 2); g.fill();
  return c;
}

/** Round die-cut sticker with big text. */
export function stickerCanvas(text: string, bg: string, fg: string, d = 250, size = 112) {
  const { c, g } = canvas2d(d, d);
  g.fillStyle = bg;
  g.beginPath(); g.arc(d / 2, d / 2, d / 2 - 2, 0, Math.PI * 2); g.fill();
  g.strokeStyle = fg;
  g.lineWidth = 5;
  g.beginPath(); g.arc(d / 2, d / 2, d / 2 - 16, 0, Math.PI * 2); g.stroke();
  g.fillStyle = fg;
  g.font = `400 ${size}px ${CFONT.head}`;
  g.textAlign = 'center';
  const m = g.measureText(text);
  g.fillText(text, d / 2, d / 2 + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2);
  return c;
}

/** Small label tag: mono caps on a paper strip, hand-cut. */
export function tag(text: string, bg: string, fg: string, size = 26, o: CutoutOpts = {}): Cutout {
  const font = `700 ${size}px ${CFONT.mono}`;
  const mg = canvas2d(4, 4).g;
  mg.font = font;
  mg.letterSpacing = '2px';
  const m = mg.measureText(text);
  const asc = mg.measureText('ẤỘĐ').actualBoundingBoxAscent, desc = mg.measureText('gy').actualBoundingBoxDescent;
  const padX = 16, padY = 10;
  const w = Math.ceil(m.width + 2 * padX), h = Math.ceil(asc + desc + 2 * padY);
  const { c, g } = canvas2d(w, h);
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  g.fillStyle = fg;
  g.font = font;
  g.letterSpacing = '2px';
  g.fillText(text, padX + 1, padY + asc);
  return new Cutout(c, { border: 0, torn: 1.5, tornFreq: 1 / 20, paper: bg, lift: 8, jitter: 1, sfx: 'pop', ...o });
}

/** Fat hand-drawn arrow pointing +x (length L), colour fill + ink outline. */
export function arrowCanvas(L: number, color: string, thick = 30, seed = 1) {
  const head = thick * 1.9, pad = 8;
  const w = L + 2 * pad, h = Math.ceil(head + 2 * pad);
  const { c, g } = canvas2d(w, h);
  const j = (n: number) => (hash(seed, n) - 0.5) * 4;
  const y = h / 2;
  g.beginPath();
  g.moveTo(pad + j(1), y - thick / 2 + j(2));
  g.lineTo(pad + L - head + j(3), y - thick / 2 + j(4));
  g.lineTo(pad + L - head + j(5), y - head / 2);
  g.lineTo(pad + L, y + j(6));
  g.lineTo(pad + L - head + j(7), y + head / 2);
  g.lineTo(pad + L - head + j(8), y + thick / 2 + j(9));
  g.lineTo(pad + j(10), y + thick / 2 + j(11));
  g.closePath();
  g.fillStyle = color;
  g.fill();
  g.strokeStyle = C.ink;
  g.lineWidth = 5;
  g.lineJoin = 'round';
  g.stroke();
  return c;
}

/** Flat textured plane for a canvas (no paper edge), e.g. the fan or arrows. */
export function flat(canvas: HTMLCanvasElement): THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false });
  return new THREE.Mesh(new THREE.PlaneGeometry(canvas.width, canvas.height), mat);
}

/** Heart sticker (fill + ink outline). */
export function heartCanvas(d = 200, fill: string = C.red) {
  const { c, g } = canvas2d(d, d);
  const s = d / 100;
  g.save();
  g.scale(s, s);
  g.beginPath();
  g.moveTo(50, 88);
  g.bezierCurveTo(14, 64, 4, 44, 8, 28);
  g.bezierCurveTo(12, 10, 38, 4, 50, 26);
  g.bezierCurveTo(62, 4, 88, 10, 92, 28);
  g.bezierCurveTo(96, 44, 86, 64, 50, 88);
  g.closePath();
  g.fillStyle = fill;
  g.fill();
  g.lineWidth = 5;
  g.lineJoin = 'round';
  g.strokeStyle = C.ink;
  g.stroke();
  g.restore();
  return c;
}

/** Comic speech bubble with text (Be Vietnam Pro), tail at the bottom-left or bottom-right. */
export function bubbleCanvas(text: string, o: { size?: number; bg?: string; fg?: string; tail?: 'left' | 'right'; maxW?: number } = {}) {
  const size = o.size ?? 44, bg = o.bg ?? C.white, fg = o.fg ?? C.ink;
  const font = `800 ${size}px ${CFONT.cap}`;
  const mg = canvas2d(4, 4).g;
  mg.font = font;
  const lines = wrap(mg, text, o.maxW ?? 420);
  const lw = Math.max(...lines.map((l) => mg.measureText(l).width));
  const lh = size * 1.18, padX = 30, padY = 20, tail = 34;
  const w = Math.ceil(lw + 2 * padX + 8), bh = Math.ceil(lines.length * lh + 2 * padY), h = bh + tail + 8;
  const { c, g } = canvas2d(w, h);
  const tx = o.tail === 'right' ? w - 70 : 50;
  g.beginPath();
  g.roundRect(4, 4, w - 8, bh - 4, 26);
  g.moveTo(tx, bh - 6);
  g.lineTo(tx + (o.tail === 'right' ? 26 : -18), h - 4);
  g.lineTo(tx + (o.tail === 'right' ? -10 : 34), bh - 6);
  g.fillStyle = bg;
  g.fill();
  g.lineWidth = 5;
  g.lineJoin = 'round';
  g.strokeStyle = C.ink;
  g.stroke();
  // cover the seam between the tail and the box
  g.fillStyle = bg;
  g.fillRect(tx - 12 + (o.tail === 'right' ? -6 : 0), bh - 12, 40, 10);
  g.fillStyle = fg;
  g.font = font;
  g.textBaseline = 'middle';
  lines.forEach((l, i) => g.fillText(l, padX + 4, padY + 4 + lh * (i + 0.5)));
  return c;
}

/** Paper phone: ink body, white screen. Returns the canvas and the screen rect (canvas px). */
export function phoneCanvas(w = 440, h = 820) {
  const { c, g } = canvas2d(w, h);
  const r = w * 0.12, bez = w * 0.05;
  g.fillStyle = C.ink;
  g.beginPath(); g.roundRect(0, 0, w, h, r); g.fill();
  const screen = { x: bez, y: bez * 2.2, w: w - 2 * bez, h: h - bez * 4.4 };
  g.fillStyle = C.white;
  g.beginPath(); g.roundRect(screen.x, screen.y, screen.w, screen.h, r * 0.5); g.fill();
  g.fillStyle = '#3a3a3a';
  g.beginPath(); g.roundRect(w / 2 - w * 0.12, bez * 0.75, w * 0.24, bez * 0.7, bez * 0.35); g.fill();
  return { c, screen };
}

/** Smoke / dust puff: overlapping circles, light grey shading (for halftone or flat). */
export function puffCanvas(d = 300, seed = 1) {
  const { c, g } = canvas2d(d, d * 0.8);
  const n = 7;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + hash(seed, i) * 0.6;
    const rr = d * (0.18 + 0.08 * hash(seed, i, 2));
    const x = d / 2 + Math.cos(a) * d * 0.22, y = d * 0.42 + Math.sin(a) * d * 0.14;
    g.fillStyle = i % 2 ? '#ffffff' : '#ece8e0';
    g.beginPath(); g.arc(x, y, rr, 0, Math.PI * 2); g.fill();
  }
  g.fillStyle = '#ffffff';
  g.beginPath(); g.arc(d / 2, d * 0.42, d * 0.24, 0, Math.PI * 2); g.fill();
  return c;
}

/** Row of crowd silhouettes (heads + shoulders), ink on transparent. */
export function crowdCanvas(w = 1200, h = 220, seed = 7, ink: string = C.ink) {
  const { c, g } = canvas2d(w, h);
  g.fillStyle = ink;
  const n = Math.round(w / 46);
  for (let row = 0; row < 2; row++) {
    for (let i = 0; i < n; i++) {
      const x = (i + 0.5 + row * 0.5) * (w / n) + (hash(seed, i, row) - 0.5) * 18;
      const r = 20 + hash(seed, i, row, 2) * 8;
      const y = h - (row ? 70 : 118) - hash(seed, i, row, 3) * 22;
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.ellipse(x, y + r * 2.6, r * 1.9, r * 1.8, 0, 0, Math.PI * 2); g.fill();
    }
  }
  return c;
}

/** Map pin (ink teardrop, coloured core). */
export function pinCanvas(h = 120, core: string = C.yellow) {
  const w = h * 0.72;
  const { c, g } = canvas2d(w, h);
  const r = w / 2 - 4;
  g.beginPath();
  g.arc(w / 2, r + 4, r, Math.PI * 0.82, Math.PI * 0.18);
  g.lineTo(w / 2, h - 3);
  g.closePath();
  g.fillStyle = C.ink;
  g.fill();
  g.fillStyle = core;
  g.beginPath(); g.arc(w / 2, r + 4, r * 0.42, 0, Math.PI * 2); g.fill();
  return c;
}

/** Copy of a region of an image, scaled to `outW` px wide, with an optional canvas filter
 *  (e.g. 'brightness(1.6) contrast(1.2)' to lift a night shot before halftoning). */
export function crop(src: Img, sx: number, sy: number, sw: number, sh: number, outW = sw, filter = 'none') {
  const k = outW / sw;
  const { c, g } = canvas2d(Math.round(sw * k), Math.round(sh * k));
  g.filter = filter;
  g.drawImage(src, sx, sy, sw, sh, 0, 0, c.width, c.height);
  return c;
}

/** Halftone photo print: a rectangle of paper with the image screened in two inks. */
export function photoPrint(src: Img, ht: HalftoneOpts, o: CutoutOpts = {}): Cutout {
  return new Cutout(src, {
    border: 14, torn: 2.2, tornFreq: 1 / 26, paper: C.white, lift: 18, jitter: 1.1,
    halftone: { paper: C.white, cell: 7, angle: 15, contrast: 1.25, ...ht }, ...o,
  });
}
