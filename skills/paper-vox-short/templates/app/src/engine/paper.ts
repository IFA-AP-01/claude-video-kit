// Paper: a tiling procedural paper map (mottling + fibres + tooth) generated once on a canvas
// from a fixed seed, the GLSL to apply it to any colour, and the flat beat-colour background.
import * as THREE from 'three';
import { hash, mulberry32, vnoise2 } from './rand';
import { C } from './palette';

export const PAPER_TILE = 1024;

/** Shared GLSL: value noise / fbm (seeded by the caller) + paperize(). */
export const NOISE_GLSL = /* glsl */ `
float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = h21(i), b = h21(i + vec2(1, 0)), c = h21(i + vec2(0, 1)), d = h21(i + vec2(1, 1));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float fbm(vec2 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { s += a * vnoise(p); p = p * 2.03 + 17.1; a *= 0.5; }
  return s / 0.9375;
}`;

export const PAPER_GLSL = /* glsl */ `
uniform sampler2D tPaper;
/** Modulate a linear colour by the paper map at pixel position px; k = strength (~0.1–0.2). */
vec3 paperize(vec3 c, vec2 px, float k) {
  float v = texture2D(tPaper, px / ${PAPER_TILE.toFixed(1)}).r - 0.5;
  return c * (1.0 + v * k);
}`;

let paperTex: THREE.Texture | null = null;

/** Grey paper map (0.5 = neutral), tiling, built once per page from a fixed seed. */
export function paperMap(): THREE.Texture {
  if (paperTex) return paperTex;
  const N = PAPER_TILE;
  const c = document.createElement('canvas');
  c.width = c.height = N;
  const g = c.getContext('2d')!;
  const img = g.createImageData(N, N);
  // mottling (low freq) + cloudy mid freq + fine tooth, all periodic over the tile.
  // Each octave is a periodic value-noise lattice sampled once per row/column pair.
  const octaves = [6, 12, 24, 48].map((f, o) => {
    const lat = new Float32Array(f * f);
    for (let j = 0; j < f; j++) for (let i = 0; i < f; i++) lat[j * f + i] = vnoise2(i, j, f, 11 + o);
    return { f, lat, a: 0.5 / 2 ** o };
  });
  const sm = (x: number) => x * x * (3 - 2 * x);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      let m = 0;
      for (const { f, lat, a } of octaves) {
        const fx = (x / N) * f, fy = (y / N) * f;
        const xi = Math.floor(fx), yi = Math.floor(fy);
        const ux = sm(fx - xi), uy = sm(fy - yi);
        const x1 = (xi + 1) % f, y1 = (yi + 1) % f;
        const p = lat[yi * f + xi], q = lat[yi * f + x1], r = lat[y1 * f + xi], s = lat[y1 * f + x1];
        m += a * (p + (q - p) * ux + (r - p) * uy + (p - q - r + s) * ux * uy);
      }
      const tooth = hash(x, y, 3) - 0.5;
      const val = 128 + (m / 0.9375 - 0.5) * 70 + tooth * 18;
      const i = (y * N + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = val;
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  // fibres: short wavy strands, mostly lighter (exposed pulp), a few darker; wrapped at edges
  const rnd = mulberry32(1978);
  for (let k = 0; k < 1400; k++) {
    const x0 = rnd() * N, y0 = rnd() * N;
    const len = 8 + rnd() * 46, ang = rnd() * Math.PI * 2, bend = (rnd() - 0.5) * 1.4;
    const light = rnd() < 0.78;
    g.strokeStyle = light ? `rgba(255,255,255,${0.10 + rnd() * 0.22})` : `rgba(0,0,0,${0.05 + rnd() * 0.08})`;
    g.lineWidth = 0.5 + rnd() * 1.1;
    for (const ox of [-N, 0, N]) for (const oy of [-N, 0, N]) {
      const x = x0 + ox, y = y0 + oy;
      if (x < -60 || x > N + 60 || y < -60 || y > N + 60) continue;
      g.beginPath();
      g.moveTo(x, y);
      const mx = x + Math.cos(ang + bend) * len * 0.5, my = y + Math.sin(ang + bend) * len * 0.5;
      g.quadraticCurveTo(mx, my, x + Math.cos(ang) * len, y + Math.sin(ang) * len);
      g.stroke();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.NoColorSpace;
  t.anisotropy = 4;
  paperTex = t;
  return t;
}

const BG_VERT = /* glsl */ `
varying vec2 vPx;
uniform vec2 uSize, uOffset;
void main() { vPx = (uv - 0.5) * uSize + uOffset; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const BG_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uPaper;
uniform float uScale;
uniform float uSeed;
// sheets mode (uCount > 0): one sheet per beat centred at uCenters (world units), later sheets
// lying on top of earlier ones along torn edges halfway between centres
#define MAX_SHEETS 8
uniform int uCount;
uniform vec2 uCenters[MAX_SHEETS];
uniform vec3 uColors[MAX_SHEETS];
uniform vec3 uRim;
varying vec2 vPx;
${NOISE_GLSL}
${PAPER_GLSL}
/** Shading of one fold line across the sheet (k = 0 roughly horizontal, 1 roughly vertical):
 *  one face tilts toward the light, plus a thin bright ridge with a groove beside it. */
float fold(vec2 px, float k, float uSeed) {
  float a = (h21(vec2(uSeed, k + 1.0)) - 0.5) * 0.3 + k * 1.5708;
  vec2 dir = vec2(cos(a), sin(a)), n = vec2(-dir.y, dir.x);
  vec2 p0 = n * (h21(vec2(uSeed, k + 7.0)) - 0.5) * (k < 0.5 ? 900.0 : 560.0);
  float d = dot(px - p0, n) + 4.0 * (vnoise(vec2(dot(px, dir) * 0.012, uSeed + k * 9.0)) - 0.5);
  float side = sign(d) * exp(-abs(d) / 80.0) * 0.07;
  float ridge = exp(-d * d / 3.0) * 0.14 - exp(-(d - 3.0) * (d - 3.0) / 8.0) * 0.14;
  return side + ridge;
}
/** Loose fibres in the pulp: one short, slightly curved hair per 46 px cell, about half of
 *  them lighter than the sheet, half darker. Returns a signed luminance change. */
float fibres(vec2 px) {
  const float S = 46.0;
  vec2 cell = floor(px / S);
  float acc = 0.0;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 id = cell + vec2(float(i), float(j)) + uSeed * 13.0;
    float h = h21(id), h2 = h21(id + 31.7), h3 = h21(id + 57.1);
    if (h3 < 0.35) continue;                    // not every cell has a fibre
    vec2 c0 = (cell + vec2(float(i), float(j)) + vec2(h, h2)) * S;
    float a = h21(id + 9.3) * 6.2832;
    vec2 dir = vec2(cos(a), sin(a)), n = vec2(-dir.y, dir.x);
    vec2 q = px - c0;
    float along = dot(q, dir), len = 14.0 + 26.0 * h2;
    float across = dot(q, n) - 0.012 * along * along * (h - 0.5);   // gentle curl
    float m = exp(-across * across / 0.9) * (1.0 - smoothstep(len * 0.6, len, abs(along)));
    acc += m * (h3 > 0.68 ? 1.0 : -0.8);
  }
  return acc;
}
void main() {
  vec2 px = vPx * uScale;
  vec3 col = uColor;
  float seed = uSeed, rim = 0.0, shade = 0.0;
  vec2 lp = px;                                   // sheet-local px (folds, mottling)
  if (uCount > 0) {
    // perturbed Voronoi: sheet i wins over j where the torn bisector says so (antisymmetric)
    float tear = (fbm(px * 0.006 + 3.1) - 0.5) * 70.0 + (vnoise(px * 0.09) - 0.5) * 7.0;
    float bestE = -1e9; int best = 0, other = 0;
    for (int i = 0; i < MAX_SHEETS; i++) {
      if (i >= uCount) break;
      float e = 1e9; int oj = i;
      for (int j = 0; j < MAX_SHEETS; j++) {
        if (j >= uCount) break;
        if (j == i) continue;
        vec2 ci = uCenters[i] * uScale, cj = uCenters[j] * uScale;
        float d = dot(px - 0.5 * (ci + cj), normalize(ci - cj)) + (i < j ? tear : -tear);
        if (d < e) { e = d; oj = j; }
      }
      if (e > bestE) { bestE = e; best = i; other = oj; }
    }
    for (int i = 0; i < MAX_SHEETS; i++) if (i == best) { col = uColors[i]; lp = px - uCenters[i] * uScale; }
    seed = uSeed + float(best) * 0.731;
    if (uCount > 1) {
      if (best > other) rim = 1.0 - smoothstep(4.0, 7.0, bestE);          // torn white core on top
      else shade = 0.3 * exp(-max(bestE, 0.0) / 22.0);                     // its shadow below
    }
  }
  // coloured construction paper: fibres + tooth from the paper map, then uneven dye
  vec3 c = paperize(col, px, uPaper);
  // (factors are linear light: ±8% here is about ±4% on screen)
  c *= 0.92 + 0.16 * fbm(lp * 0.0012 + 3.7 + seed);         // large soft mottling
  c *= 0.965 + 0.07 * fbm(lp * 0.007 + 11.0 + seed * 1.3);  // smaller dye blotches
  c *= 1.0 + 0.10 * fibres(px);
  // faint crumple wrinkles (ridged noise) and two folds from being stored folded
  float r = 1.0 - abs(2.0 * fbm(lp * 0.0035 + seed * 1.7) - 1.0);
  c *= 1.0 - 0.07 * pow(r, 8.0);
  c *= 1.0 + fold(lp, 0.0, seed) + fold(lp, 1.0, seed);
  c = mix(c, paperize(uRim, px, uPaper), rim);
  c *= 1.0 - shade;
  gl_FragColor = vec4(c, 1.0);
}`;

/** Flat beat-colour sheet of construction paper filling the frame at the far layer. */
export class PaperBg {
  readonly mesh: THREE.Mesh;
  private mat: THREE.ShaderMaterial;

  /** w×h world units; `scale` maps world units to paper-map pixels (= 1/k of the layer). */
  constructor(w: number, h: number, scale = 1) {
    this.mat = new THREE.ShaderMaterial({
      vertexShader: BG_VERT, fragmentShader: BG_FRAG, depthTest: false, depthWrite: false,
      uniforms: {
        uColor: { value: new THREE.Color() }, uPaper: { value: 0.4 }, uScale: { value: scale },
        uSeed: { value: 0 }, uOffset: { value: new THREE.Vector2() },
        uCount: { value: 0 }, uRim: { value: new THREE.Color(C.white) },
        uCenters: { value: Array.from({ length: MAX_SHEETS }, () => new THREE.Vector2()) },
        uColors: { value: Array.from({ length: MAX_SHEETS }, () => new THREE.Color()) },
        uSize: { value: new THREE.Vector2(w, h) }, tPaper: { value: paperMap() },
      },
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), this.mat);
    this.mesh.renderOrder = -1000;
    this.mesh.frustumCulled = false;
  }

  set color(hex: string) { (this.mat.uniforms.uColor.value as THREE.Color).set(hex); }
  /** Which sheet: moves the folds and mottling (set per beat so each beat is a new sheet). */
  set seed(v: number) { this.mat.uniforms.uSeed.value = v; }

  /** One sheet per beat at world centres (units of the z = 0 plane), on one big table. */
  sheets(centers: { x: number; y: number }[], colors: string[]) {
    const u = this.mat.uniforms, n = Math.min(MAX_SHEETS, centers.length);
    u.uCount.value = n;
    for (let i = 0; i < n; i++) {
      (u.uCenters.value as THREE.Vector2[])[i].set(centers[i].x, centers[i].y);
      (u.uColors.value as THREE.Color[])[i].set(colors[i]);
    }
  }

  /** Keep the plane under the camera; the paper stays fixed in the world (uOffset). */
  follow(x: number, y: number) {
    this.mesh.position.x = x;
    this.mesh.position.y = y;
    (this.mat.uniforms.uOffset.value as THREE.Vector2).set(x, y);
  }
}

const MAX_SHEETS = 8;
