// Duotone halftone. Image luminance → two rotated dot screens on paper: the beat colour for
// the mid-tones and ink for the shadows. GLSL (used by cutout.ts for photo cut-outs) and a
// CPU version for images printed inside canvas-drawn things (newspaper clippings).
import * as THREE from 'three';

export interface HalftoneOpts {
  color: string;      // dot colour for mid-tones (usually the beat colour)
  ink?: string;       // second screen for shadows (default ink)
  paper?: string;     // paper under the dots (default: the cut-out's paper)
  cell?: number;      // screen pitch in texture px (default 9)
  angle?: number;     // screen angle in degrees for the colour screen (default 15; ink +30)
  contrast?: number;  // luminance contrast before screening (default 1.15)
}

export const HALFTONE_GLSL = /* glsl */ `
uniform vec3 uHtColor, uHtInk, uHtPaper;
uniform float uHtCell, uHtAngle, uHtContrast;
float htDot(vec2 px, float cell, float ang, float v) {
  float c = cos(ang), s = sin(ang);
  vec2 q = mat2(c, -s, s, c) * px / cell;
  float d = length(fract(q) - 0.5);
  float r = sqrt(clamp(v, 0.0, 1.0)) * 0.7071 * 1.04;   // dot area ∝ tone
  float aa = max(fwidth(d), 0.02);
  return 1.0 - smoothstep(r - aa, r + aa, d);
}
float htLum(vec3 rgbLinear) {
  float l = dot(pow(max(rgbLinear, 0.0), vec3(1.0 / 2.2)), vec3(0.299, 0.587, 0.114));
  return clamp((l - 0.5) * uHtContrast + 0.5, 0.0, 1.0);
}
/** Two plates: \`inkSrc\` drives the ink screen, \`colSrc\` the colour screen (pass the image
 *  sampled at a small offset for print misregistration, or the same colour for none). */
vec3 halftone2(vec2 px, vec3 inkSrc, vec3 colSrc) {
  float li = htLum(inkSrc), lc = htLum(colSrc);
  float c1 = htDot(px, uHtCell, uHtAngle, 1.0 - lc);
  float c2 = htDot(px, uHtCell * 0.92, uHtAngle + 0.5236, (0.55 - li) / 0.55);
  vec3 col = mix(uHtPaper, uHtColor, c1);
  return mix(col, uHtInk, c2 * 0.94);
}
vec3 halftone(vec2 px, vec3 rgbLinear) { return halftone2(px, rgbLinear, rgbLinear); }`;

/** Uniform values for HALFTONE_GLSL. */
export function halftoneUniforms(o: HalftoneOpts | null | undefined, paper: string) {
  return {
    uHtColor: { value: new THREE.Color(o?.color ?? '#000') },
    uHtInk: { value: new THREE.Color(o?.ink ?? '#1A1A1A') },
    uHtPaper: { value: new THREE.Color(o?.paper ?? paper) },
    uHtCell: { value: o?.cell ?? 9 },
    uHtAngle: { value: ((o?.angle ?? 15) * Math.PI) / 180 },
    uHtContrast: { value: o?.contrast ?? 1.15 },
  };
}

/**
 * CPU halftone into a 2D context: draws `src` (any canvas/image) as round ink dots on the
 * current background within the box (x, y, w, h). Deterministic; used inside clippings.
 */
export function drawHalftone(g: CanvasRenderingContext2D, src: CanvasImageSource & { width: number; height: number },
                             x: number, y: number, w: number, h: number,
                             ink: string, cell = 7, angleDeg = 45, contrast = 1.2) {
  // sample source luminance on a small grid
  const sw = Math.ceil(w), sh = Math.ceil(h);
  const tmp = document.createElement('canvas');
  tmp.width = sw; tmp.height = sh;
  const tg = tmp.getContext('2d', { willReadFrequently: true })!;
  tg.fillStyle = '#fff';
  tg.fillRect(0, 0, sw, sh);
  const s = Math.max(sw / src.width, sh / src.height);   // cover
  tg.drawImage(src, (sw - src.width * s) / 2, (sh - src.height * s) / 2, src.width * s, src.height * s);
  const px = tg.getImageData(0, 0, sw, sh).data;
  const lum = (ix: number, iy: number) => {
    const cx = Math.min(sw - 1, Math.max(0, Math.round(ix))), cy = Math.min(sh - 1, Math.max(0, Math.round(iy)));
    const i = (cy * sw + cx) * 4;
    const l = (0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]) / 255;
    return Math.min(1, Math.max(0, (l - 0.5) * contrast + 0.5));
  };
  const a = (angleDeg * Math.PI) / 180, ca = Math.cos(a), sa = Math.sin(a);
  g.save();
  g.beginPath();
  g.rect(x, y, w, h);
  g.clip();
  g.fillStyle = ink;
  const R = Math.hypot(w, h);
  for (let j = -R / cell; j <= R / cell; j++) {
    for (let i = -R / cell; i <= R / cell; i++) {
      // rotated grid around the box centre
      const u = i * cell, v = j * cell;
      const lx = w / 2 + u * ca - v * sa, ly = h / 2 + u * sa + v * ca;
      if (lx < -cell || ly < -cell || lx > w + cell || ly > h + cell) continue;
      const r = Math.sqrt(1 - lum(lx, ly)) * cell * 0.72;
      if (r < 0.35) continue;
      g.beginPath();
      g.arc(x + lx, y + ly, r, 0, Math.PI * 2);
      g.fill();
    }
  }
  g.restore();
}
