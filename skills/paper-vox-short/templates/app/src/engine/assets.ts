// Photo cut-outs. Real photos go in `<project>/assets/cut/<name>.png` (background removed,
// alpha) and are picked up at build time. Until they exist, `loadCut()` falls back to a neutral
// generated sports-car silhouette (no real product shape, no logos) shaded in greys so the
// halftone still reads light and shadow.
import { canvas2d } from './text';

type Img = CanvasImageSource & { width: number; height: number };

const urls = import.meta.glob<string>('../../../assets/cut/*.png', { eager: true, query: '?url', import: 'default' });

/** Names of the cut-outs that exist (file name without .png). */
export const cutNames = Object.keys(urls).map((p) => p.split('/').pop()!.replace(/\.png$/, ''));

let placeholder: HTMLCanvasElement | null = null;

/** Neutral low two-seater in side view, facing right. 1200×400, transparent background. */
export function placeholderCar(): HTMLCanvasElement {
  if (placeholder) return placeholder;
  const { c, g } = canvas2d(1200, 400);
  const wheels = [265, 935], wy = 318, wr = 74;

  // body
  g.beginPath();
  g.moveTo(1172, 292);
  g.bezierCurveTo(1170, 262, 1140, 246, 1060, 236);           // nose up to hood
  g.bezierCurveTo(960, 222, 860, 206, 790, 192);               // hood
  g.bezierCurveTo(720, 140, 660, 112, 590, 108);               // windshield
  g.bezierCurveTo(500, 106, 420, 118, 360, 150);               // roof → fastback
  g.bezierCurveTo(260, 186, 150, 196, 64, 214);                // rear deck
  g.bezierCurveTo(36, 222, 26, 250, 30, 286);                  // tail
  g.lineTo(34, 318);
  g.lineTo(wheels[0] - wr - 22, 322);
  g.arc(wheels[0], wy, wr + 18, Math.PI, 0, false);            // rear arch
  g.lineTo(wheels[1] - wr - 18, 324);
  g.arc(wheels[1], wy, wr + 18, Math.PI, 0, false);            // front arch
  g.lineTo(1150, 320);
  g.closePath();
  const body = g.createLinearGradient(0, 100, 0, 330);
  body.addColorStop(0, '#d9d9d9');
  body.addColorStop(0.35, '#a6a6a6');
  body.addColorStop(0.62, '#6c6c6c');
  body.addColorStop(1, '#2e2e2e');
  g.fillStyle = body;
  g.fill();

  // shoulder highlight + door line
  g.strokeStyle = 'rgba(255,255,255,0.75)';
  g.lineWidth = 7;
  g.beginPath();
  g.moveTo(110, 222);
  g.bezierCurveTo(400, 200, 800, 214, 1100, 246);
  g.stroke();
  g.strokeStyle = 'rgba(0,0,0,0.35)';
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(470, 140);
  g.bezierCurveTo(455, 200, 460, 260, 480, 300);
  g.stroke();

  // glasshouse
  g.beginPath();
  g.moveTo(760, 196);
  g.bezierCurveTo(700, 150, 650, 126, 590, 122);
  g.bezierCurveTo(520, 120, 450, 130, 395, 160);
  g.bezierCurveTo(470, 176, 640, 190, 760, 196);
  g.closePath();
  const glass = g.createLinearGradient(0, 120, 0, 196);
  glass.addColorStop(0, '#5a5a5a');
  glass.addColorStop(1, '#141414');
  g.fillStyle = glass;
  g.fill();

  // lamps + sill shadow
  g.fillStyle = '#f4f4f4';
  g.beginPath(); g.ellipse(1120, 258, 34, 9, -0.12, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#3a3a3a';
  g.beginPath(); g.ellipse(70, 236, 22, 8, 0.1, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(0,0,0,0.5)';
  g.fillRect(wheels[0] + wr + 18, 300, wheels[1] - wheels[0] - 2 * wr - 36, 22);

  // wheels
  for (const x of wheels) {
    g.fillStyle = '#111';
    g.beginPath(); g.arc(x, wy, wr, 0, Math.PI * 2); g.fill();
    const rim = g.createRadialGradient(x - 12, wy - 14, 6, x, wy, wr * 0.68);
    rim.addColorStop(0, '#e6e6e6');
    rim.addColorStop(1, '#7c7c7c');
    g.fillStyle = rim;
    g.beginPath(); g.arc(x, wy, wr * 0.66, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#2a2a2a';
    g.lineWidth = 9;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.3;
      g.beginPath();
      g.moveTo(x + Math.cos(a) * 12, wy + Math.sin(a) * 12);
      g.lineTo(x + Math.cos(a) * wr * 0.62, wy + Math.sin(a) * wr * 0.62);
      g.stroke();
    }
    g.fillStyle = '#222';
    g.beginPath(); g.arc(x, wy, 11, 0, Math.PI * 2); g.fill();
  }
  placeholder = c;
  return c;
}

/** Load assets/cut/<name>.png, or the placeholder car if it isn't there yet. */
export async function loadCut(name: string): Promise<Img> {
  const url = Object.entries(urls).find(([p]) => p.endsWith(`/${name}.png`))?.[1];
  if (!url) return placeholderCar();
  const img = new Image();
  img.src = url;
  await img.decode();
  return img;
}

/** Vertically flipped copy (upside-down car on the loop). */
export function flipped(src: Img, horizontal = false): HTMLCanvasElement {
  const { c, g } = canvas2d(src.width, src.height);
  g.translate(horizontal ? src.width : 0, horizontal ? 0 : src.height);
  g.scale(horizontal ? -1 : 1, horizontal ? 1 : -1);
  g.drawImage(src, 0, 0);
  return c;
}

const frameUrls = import.meta.glob<string>('../../../assets/frames/*.jpg', { eager: true, query: '?url', import: 'default' });

/** Load assets/frames/<name>.jpg (stills pulled from the event video). Throws if missing. */
export async function loadFrame(name: string): Promise<Img> {
  const url = Object.entries(frameUrls).find(([p]) => p.endsWith(`/${name}.jpg`))?.[1];
  if (!url) throw new Error(`missing assets/frames/${name}.jpg`);
  const img = new Image();
  img.src = url;
  await img.decode();
  return img;
}

const rawUrls = import.meta.glob<string>('../../../assets/raw/*.png', { eager: true, query: '?url', import: 'default' });

/** Load assets/raw/<name>.png (reference screenshots; show only as halftone clippings). */
export async function loadRaw(name: string): Promise<Img> {
  const url = Object.entries(rawUrls).find(([p]) => p.endsWith(`/${name}.png`))?.[1];
  if (!url) throw new Error(`missing assets/raw/${name}.png`);
  const img = new Image();
  img.src = url;
  await img.decode();
  return img;
}
