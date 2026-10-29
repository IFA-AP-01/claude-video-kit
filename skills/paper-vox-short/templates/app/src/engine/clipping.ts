// Fake newspaper clipping drawn on a canvas: fictional masthead, date line, Vietnamese headline,
// deck, an optional halftone photo and justified body columns — then torn out as a Cutout.
// No real publication names or logos.
import { canvas2d, wrap } from './text';
import { C, CFONT } from './palette';
import { Cutout, type CutoutOpts } from './cutout';
import { drawHalftone } from './halftone';

export interface ClippingOpts {
  w?: number;
  masthead?: string;          // fictional paper name
  dateline?: string;          // e.g. 'Thứ Sáu, 16.10.2026 · Số 4.712'
  kicker?: string;            // small label above the headline
  headline: string;
  deck?: string;
  body: string;               // flowed into columns until the clipping is full
  photo?: CanvasImageSource & { width: number; height: number };
  photoH?: number;
  caption?: string;           // photo caption
  columns?: number;
  height?: number;            // total height (body is cut off there, like a real clipping)
  ink?: string;
  paper?: string;
  cutout?: CutoutOpts;
}

/** Draws the clipping page (no tearing) and returns the canvas. */
export function drawClipping(o: ClippingOpts): HTMLCanvasElement {
  const W = o.w ?? 760, M = 34, ink = o.ink ?? C.ink;
  const H = o.height ?? 980;
  const { c, g } = canvas2d(W, H);
  g.fillStyle = o.paper ?? C.newsprint;
  g.fillRect(0, 0, W, H);
  g.fillStyle = ink;
  g.strokeStyle = ink;
  let y = M;

  if (o.masthead) {
    g.font = `700 58px ${CFONT.serif}`;
    g.textAlign = 'center';
    g.textBaseline = 'alphabetic';
    const m = g.measureText(o.masthead);
    y += m.actualBoundingBoxAscent;
    g.fillText(o.masthead, W / 2, y);
    y += 16;
    g.lineWidth = 3; g.beginPath(); g.moveTo(M, y); g.lineTo(W - M, y); g.stroke();
    y += 6;
    g.lineWidth = 1; g.beginPath(); g.moveTo(M, y); g.lineTo(W - M, y); g.stroke();
    if (o.dateline) {
      g.font = `500 17px ${CFONT.mono}`;
      y += 24;
      g.fillText(o.dateline, W / 2, y);
      y += 12;
      g.lineWidth = 1; g.beginPath(); g.moveTo(M, y); g.lineTo(W - M, y); g.stroke();
    }
    y += 26;
  }
  g.textAlign = 'left';
  if (o.kicker) {
    g.font = `700 19px ${CFONT.mono}`;
    g.letterSpacing = '3px';
    y += 18;
    g.fillText(o.kicker.toUpperCase(), M, y);
    g.letterSpacing = '0px';
    y += 16;
  }
  g.font = `700 50px ${CFONT.serif}`;
  for (const line of wrap(g, o.headline, W - 2 * M)) {
    const m = g.measureText(line);
    y += m.fontBoundingBoxAscent;
    g.fillText(line, M, y);
    y += m.fontBoundingBoxDescent - 4;
  }
  if (o.deck) {
    g.font = `italic 400 25px ${CFONT.serif}`;
    y += 10;
    for (const line of wrap(g, o.deck, W - 2 * M)) { y += 31; g.fillText(line, M, y); }
  }
  y += 22;
  if (o.photo) {
    const ph = o.photoH ?? 300;
    drawHalftone(g, o.photo, M, y, W - 2 * M, ph, ink, 6.5, 45, 1.25);
    g.lineWidth = 1.5;
    g.strokeRect(M, y, W - 2 * M, ph);
    y += ph + 8;
    if (o.caption) {
      g.font = `italic 400 17px ${CFONT.serif}`;
      y += 18;
      g.fillText(o.caption, M, y);
    }
    y += 18;
  }

  // body: justified columns, flowed top to bottom, left to right, cut at the bottom edge
  const cols = o.columns ?? 3, gutter = 22;
  const cw = (W - 2 * M - gutter * (cols - 1)) / cols;
  const lh = 23;
  g.font = `400 17px ${CFONT.serif}`;
  const lines: string[][] = [];
  for (const para of o.body.split(/\n+/)) {
    const ls = wrap(g, para, cw);
    ls.forEach((l, i) => lines.push(i === ls.length - 1 ? [l, 'last'] : [l]));
  }
  const rows = Math.floor((H - y + lh) / lh);
  let k = 0;
  for (let col = 0; col < cols && k < lines.length; col++) {
    const x = M + col * (cw + gutter);
    for (let r = 0; r < rows && k < lines.length; r++, k++) {
      const [text, last] = lines[k];
      const yy = y + r * lh + 14;
      const words = text.split(' ');
      if (last || words.length < 2) { g.fillText(text, x, yy); continue; }
      const total = words.reduce((s, w) => s + g.measureText(w).width, 0);
      const sp = (cw - total) / (words.length - 1);
      let xx = x;
      for (const w of words) { g.fillText(w, xx, yy); xx += g.measureText(w).width + sp; }
    }
    if (col < cols - 1) {
      g.lineWidth = 0.8;
      g.beginPath(); g.moveTo(x + cw + gutter / 2, y); g.lineTo(x + cw + gutter / 2, H); g.stroke();
    }
  }
  return c;
}

/** Clipping torn out of the page. */
export function clipping(o: ClippingOpts): Cutout {
  return new Cutout(drawClipping(o), {
    border: 0, torn: 9, tornFreq: 1 / 30, rim: 7, paper: o.paper ?? C.newsprint, lift: 16, paperAmt: 0.2,
    ...o.cutout,
  });
}
