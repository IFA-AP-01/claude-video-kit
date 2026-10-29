// Fonts + 2D-canvas text helpers. All text in this project is drawn on canvases (paper strips,
// clippings, stamps, labels) and uploaded once in init(), so layout never depends on timing.
// @fontsource CSS registers each family per unicode subset; preloadFonts() forces the latin,
// latin-ext and vietnamese subsets of every face we use to load before anything is measured.
import '@fontsource/anton/400.css';
import '@fontsource/be-vietnam-pro/800.css';
import '@fontsource/noto-serif/400.css';
import '@fontsource/noto-serif/700.css';
import '@fontsource/noto-serif/400-italic.css';
import '@fontsource/ibm-plex-mono/500.css';
import '@fontsource/ibm-plex-mono/700.css';
import { CFONT } from './palette';

const FACES: string[] = [
  `400 64px ${CFONT.head}`,
  `800 64px ${CFONT.cap}`,
  `400 64px ${CFONT.serif}`,
  `700 64px ${CFONT.serif}`,
  `italic 400 64px ${CFONT.serif}`,
  `500 64px ${CFONT.mono}`,
  `700 64px ${CFONT.mono}`,
];
/** Touches latin, latin-ext and the vietnamese ranges (stacked diacritics, đ, ơ, ư). */
const SAMPLE = 'AaZz09?!.,–ĐđƠơƯưẠạẮắẰằẶặẾếỀềỄễỆệỎỏỐốỒồỘộỚớỢợỤụỨứỰựỲỳỴỵỸỹ₫';

export async function preloadFonts(): Promise<void> {
  await Promise.all(FACES.map((f) => document.fonts.load(f, SAMPLE)));
  await document.fonts.ready;
  const missing = FACES.filter((f) => !document.fonts.check(f, SAMPLE));
  if (missing.length) throw new Error(`fonts not loaded: ${missing.join(', ')}`);
}

/** 2D canvas of w×h logical px drawn at `scale`× (scale 1 = texture px == screen px). */
export function canvas2d(w: number, h: number, scale = 1) {
  const c = document.createElement('canvas');
  c.width = Math.ceil(w * scale);
  c.height = Math.ceil(h * scale);
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.scale(scale, scale);
  return { c, g };
}

/** Greedy word wrap with the context's current font. */
export function wrap(g: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const out: string[] = [];
  let line = '';
  for (const w of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${w}` : w;
    if (line && g.measureText(next).width > maxW) { out.push(line); line = w; } else line = next;
  }
  if (line) out.push(line);
  return out;
}
