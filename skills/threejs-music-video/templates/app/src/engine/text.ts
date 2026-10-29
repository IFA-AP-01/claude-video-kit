// SDF text via troika-three-text. Layout is async in troika, so every Text a scene will
// ever show must be created and synced in Scene.init() — never change `.text` while
// rendering (that would make frames depend on worker timing). Color / opacity /
// transforms are uniforms and safe to animate per frame.
import { Text, configureTextBuilder, preloadFont } from 'troika-three-text';
import { CSS_FACES, FONT } from './palette';

// Main-thread SDF generation: slower at init, but no worker races in headless export.
configureTextBuilder({ useWorker: false, sdfGlyphSize: 128 });

export interface TextOpts {
  font?: string;
  size?: number;
  color?: string;
  anchorX?: Text['anchorX'];
  anchorY?: Text['anchorY'];
  letterSpacing?: number;
  maxWidth?: number;
}

export function makeText(s: string, o: TextOpts = {}): Text {
  const t = new Text();
  t.text = s;
  t.font = o.font ?? FONT.display;
  t.fontSize = o.size ?? 64;
  t.color = o.color ?? '#ffffff';
  t.anchorX = o.anchorX ?? 'left';
  t.anchorY = o.anchorY ?? 'middle';
  t.letterSpacing = o.letterSpacing ?? 0;
  if (o.maxWidth) t.maxWidth = o.maxWidth;
  return t;
}

export function syncAll(texts: Text[]): Promise<void> {
  return Promise.all(texts.map((t) => new Promise<void>((res) => t.sync(res)))).then(() => {});
}

/** SDF fonts for troika + the same files as CSS faces for canvas text. */
export function preloadFonts(): Promise<void> {
  const sdf = Object.values(FONT).map((font) => new Promise<void>((res) => preloadFont({ font }, res)));
  const css = CSS_FACES.map(async ([family, url, weight, style]) => {
    const face = new FontFace(family, `url(${url})`, { weight, style: style ?? 'normal' });
    await face.load();
    document.fonts.add(face);
  });
  return Promise.all([...sdf, ...css]).then(() => {});
}

/** Laid-out advance width (needs a synced Text). */
export function textWidth(t: Text): number {
  const b = t.textRenderInfo?.blockBounds;
  return b ? b[2] - b[0] : 0;
}
