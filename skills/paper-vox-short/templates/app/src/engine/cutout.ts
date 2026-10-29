// Paper cut-out: any image with alpha (rembg photo, canvas drawing) becomes a piece of paper
// with a white border offset from its silhouette, torn or scissor-cut edges, a white torn-paper
// rim, paper texture, an optional duotone halftone, slight print misregistration and rough ink
// edges, and a soft drop shadow — plus a slow stop-motion
// jitter (pose held 1/4 s, staggered per piece). Edge geometry comes from a signed distance field computed once on
// the CPU in the constructor (exact EDT), so every effect is a cheap, stable lookup per pixel.
import * as THREE from 'three';
import { hash } from './rand';
import type { CueKind } from './cues';
import { NOISE_GLSL, PAPER_GLSL, paperMap } from './paper';
import { HALFTONE_GLSL, halftoneUniforms, type HalftoneOpts } from './halftone';
import { C } from './palette';

export interface CutoutOpts {
  border?: number;       // paper border outside the source silhouette, px (0 = cut on the edge)
  torn?: number;         // edge noise amplitude, px (0 = clean scissor cut; 2–4 = hand-cut; 8+ = torn)
  tornFreq?: number;     // edge noise frequency, 1/px (default 1/36)
  rim?: number;          // white torn-paper core inside the edge, px (0 = none)
  paper?: string;        // border / paper colour (default C.white)
  rimColor?: string;
  paperAmt?: number;     // paper texture strength (default 0.14)
  lift?: number;         // height above the surface below, px → shadow offset + softness (default 18)
  shadow?: number;       // shadow opacity (default 0.34)
  jitter?: number;       // stop-motion jitter, px (default 1.4; rotation follows)
  halftone?: HalftoneOpts | null;
  misreg?: number;       // colour plate printed off register by this many px (default 1.6, 0 = none)
  rough?: number;        // ink edge roughness / spread (default 0.06, 0 = clean)
  seed?: number;
  sfx?: CueKind;         // sound when it pops in (default 'paper'; tags 'pop', counters 'tick')
}

const VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const EDGE_GLSL = /* glsl */ `
uniform sampler2D tSdf;
uniform vec2 uSize;
uniform float uBorder, uTorn, uTornFreq, uSeed;
float sdf(vec2 uv) { return texture2D(tSdf, uv).r * 192.0 - 64.0; }
/** signed distance to the paper's (torn) edge in px, < 0 inside */
float edgeDist(vec2 uv, vec2 px, out float n2) {
  float n = fbm(px * uTornFreq + uSeed) - 0.5;
  n2 = vnoise(px * 0.32 + uSeed * 3.1) - 0.5;
  return sdf(uv) - (uBorder + uTorn * (2.0 * n + 0.35 * n2));
}`;

const BODY_FRAG = /* glsl */ `
uniform sampler2D tMap;
uniform vec3 uPaperColor, uRimColor, uSubstrate;
uniform float uRim, uPaperAmt, uOpacity, uHalftone, uRough;
uniform vec2 uMis;
varying vec2 vUv;
${NOISE_GLSL}
${PAPER_GLSL}
${HALFTONE_GLSL}
${EDGE_GLSL}
float dispLum(vec3 lin) { return dot(pow(max(lin, 0.0), vec3(1.0 / 2.2)), vec3(0.299, 0.587, 0.114)); }
void main() {
  vec2 px = vUv * uSize;
  float n2;
  float e = edgeDist(vUv, px, n2);
  float aa = max(fwidth(e), 0.6);
  float a = 1.0 - smoothstep(-aa, aa, e);
  if (a <= 0.003) discard;
  vec4 img = texture2D(tMap, vUv);
  vec4 off = texture2D(tMap, vUv + uMis / uSize);   // colour plate, slightly off register
  vec3 col;
  if (uHalftone > 0.5) {
    col = mix(uPaperColor, halftone2(px, img.rgb, mix(img.rgb, off.rgb, off.a)), img.a);
  } else {
    // ink plate (dark pixels, rough-edged with a little spread) stays put; the colour plate,
    // with the ink knocked out to bare paper, lands a hair off register
    float rough = uRough * (vnoise(px * 0.55 + uSeed) - 0.5 + 0.6 * (vnoise(px * 2.1 + uSeed * 2.0) - 0.5));
    float ink0 = (1.0 - smoothstep(0.17, 0.27, dispLum(img.rgb) + rough)) * img.a;
    float ink1 = (1.0 - smoothstep(0.17, 0.27, dispLum(off.rgb))) * off.a;
    vec3 plate = mix(uPaperColor, off.rgb, off.a);
    plate = mix(plate, uSubstrate, ink1);
    col = mix(plate, img.rgb, ink0);
    // anything in neither plate (outside the art) stays the paper colour
    col = mix(uPaperColor, col, max(img.a, off.a));
  }
  if (uRim > 0.0) {
    // uneven white band where the paper's core shows through the tear
    float w = uRim * (0.45 + 1.1 * fbm(px * 0.05 + uSeed * 7.0));
    float rim = 1.0 - smoothstep(w * 0.6, w, -e);
    col = mix(col, uRimColor, rim * 0.95);
  }
  col = paperize(col, px + uSeed * 131.0, uPaperAmt);
  gl_FragColor = vec4(col, a * uOpacity);
}`;

const SHADOW_FRAG = /* glsl */ `
uniform vec3 uShadowColor;
uniform float uSoft, uShadow, uOpacity;
varying vec2 vUv;
${NOISE_GLSL}
${EDGE_GLSL}
void main() {
  vec2 px = vUv * uSize;
  float n2;
  float e = edgeDist(vUv, px, n2);
  float s = 1.0 - smoothstep(-uSoft * 0.6, uSoft, e);
  if (s <= 0.003) discard;
  gl_FragColor = vec4(uShadowColor, s * s * uShadow * uOpacity);
}`;

// ------------------------------------------------------------------------------ distance field

/** 1D squared-distance transform (Felzenszwalb & Huttenlocher). */
function edt1d(f: Float32Array, n: number, d: Float32Array, v: Int32Array, z: Float32Array) {
  let k = 0;
  v[0] = 0; z[0] = -Infinity; z[1] = Infinity;
  for (let q = 1; q < n; q++) {
    let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) { k--; s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); }
    k++; v[k] = q; z[k] = s; z[k + 1] = Infinity;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    d[q] = (q - v[k]) * (q - v[k]) + f[v[k]];
  }
}

/** Squared distance from every cell to the nearest cell where `feat` is true. */
function edt2d(feat: Uint8Array, w: number, h: number): Float32Array {
  const INF = 1e20, out = new Float32Array(w * h);
  const n = Math.max(w, h);
  const f = new Float32Array(n), d = new Float32Array(n), v = new Int32Array(n), z = new Float32Array(n + 1);
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) f[y] = feat[y * w + x] ? 0 : INF;
    edt1d(f, h, d, v, z);
    for (let y = 0; y < h; y++) out[y * w + x] = d[y];
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) f[x] = out[y * w + x];
    edt1d(f, w, d, v, z);
    for (let x = 0; x < w; x++) out[y * w + x] = d[x];
  }
  return out;
}

/** Signed distance (px, + outside) of the alpha>0.5 silhouette at 1/`ds` resolution, packed
 *  into R8: value = (d + 64) / 192. */
function sdfTexture(src: HTMLCanvasElement, ds: number): THREE.DataTexture {
  const w = Math.ceil(src.width / ds), h = Math.ceil(src.height / ds);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.drawImage(src, 0, 0, w, h);
  const a = g.getImageData(0, 0, w, h).data;
  const inside = new Uint8Array(w * h), outside = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) { const on = a[i * 4 + 3] > 127; inside[i] = on ? 1 : 0; outside[i] = on ? 0 : 1; }
  const dIn = edt2d(inside, w, h), dOut = edt2d(outside, w, h);
  const data = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    // + outside (distance to the shape), − inside (distance to the background); edge at 0
    const d = (inside[i] ? -(Math.sqrt(dOut[i]) - 0.5) : Math.sqrt(dIn[i]) - 0.5) * ds;
    data[i] = Math.max(0, Math.min(255, Math.round(((d + 64) / 192) * 255)));
  }
  // rows are bottom-up in GL; flip so uv (0,0) = bottom-left like the colour map
  const flipped = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) flipped.set(data.subarray(y * w, y * w + w), (h - 1 - y) * w);
  const t = new THREE.DataTexture(flipped, w, h, THREE.RedFormat, THREE.UnsignedByteType);
  t.minFilter = t.magFilter = THREE.LinearFilter;
  t.unpackAlignment = 1;
  t.needsUpdate = true;
  return t;
}

// -------------------------------------------------------------------------------------- cutout

let seedCounter = 1;

/** Jitter pose changes per second and amplitude scale (pops and slams stay on the 12 fps clock). */
export const JITTER_FPS = 4;
export const JITTER_AMP = 0.6;

export class Cutout {
  /** Place this (position / rotation / scale). Jitter lives on `inner`. */
  readonly group = new THREE.Group();
  /** Jittered holder for the body, shadow and anything attached (tape, labels). */
  readonly inner = new THREE.Group();
  readonly body: THREE.Mesh;
  readonly shade: THREE.Mesh;
  /** Source size (px) and padded plane size. */
  readonly w: number;
  readonly h: number;
  readonly pw: number;
  readonly ph: number;
  readonly seed: number;
  private bodyMat: THREE.ShaderMaterial;
  private shadeMat: THREE.ShaderMaterial;
  private jitter: number;
  opacity = 1;
  /** Cue kind for its pop-in; `taped` = tape attached, which gets its own rip just after. */
  sfx: CueKind;
  taped = false;

  constructor(src: CanvasImageSource & { width: number; height: number }, o: CutoutOpts = {}) {
    this.seed = o.seed ?? seedCounter++;
    this.sfx = o.sfx ?? 'paper';
    const border = o.border ?? 0, torn = o.torn ?? 2.5, lift = o.lift ?? 18;
    const soft = 4 + lift * 0.55;
    const pad = Math.ceil(border + torn * 1.5 + soft + 6);
    this.w = src.width; this.h = src.height;
    this.pw = this.w + 2 * pad; this.ph = this.h + 2 * pad;

    const c = document.createElement('canvas');
    c.width = this.pw; c.height = this.ph;
    c.getContext('2d')!.drawImage(src, pad, pad);
    const map = new THREE.CanvasTexture(c);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 4;
    const sdf = sdfTexture(c, this.pw * this.ph > 600_000 ? 2 : 1);

    const edge = {
      tSdf: { value: sdf }, uSize: { value: new THREE.Vector2(this.pw, this.ph) },
      uBorder: { value: border }, uTorn: { value: torn }, uTornFreq: { value: o.tornFreq ?? 1 / 36 },
      uSeed: { value: hash(this.seed, 7) * 100 }, uOpacity: { value: 1 },
    };
    const paper = o.paper ?? C.white;
    // print misregistration: a seeded direction per piece
    const ma = hash(this.seed, 21) * Math.PI * 2, mm = o.misreg ?? 1.6;
    const misreg = new THREE.Vector2(Math.cos(ma) * mm, Math.sin(ma) * mm);
    this.bodyMat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: BODY_FRAG, transparent: true, depthTest: false, depthWrite: false,
      uniforms: {
        ...edge, tMap: { value: map }, tPaper: { value: paperMap() },
        uPaperColor: { value: new THREE.Color(paper) }, uRimColor: { value: new THREE.Color(o.rimColor ?? C.white) },
        uRim: { value: o.rim ?? 0 }, uPaperAmt: { value: o.paperAmt ?? 0.14 },
        uHalftone: { value: o.halftone ? 1 : 0 }, ...halftoneUniforms(o.halftone, paper),
        uMis: { value: misreg }, uRough: { value: o.rough ?? 0.06 }, uSubstrate: { value: new THREE.Color(C.white) },
      },
    });
    this.shadeMat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: SHADOW_FRAG, transparent: true, depthTest: false, depthWrite: false,
      uniforms: { ...edge, uShadowColor: { value: new THREE.Color(C.shadow) },
                  uSoft: { value: soft }, uShadow: { value: o.shadow ?? 0.34 } },
    });
    const geo = new THREE.PlaneGeometry(this.pw, this.ph);
    this.body = new THREE.Mesh(geo, this.bodyMat);
    this.shade = new THREE.Mesh(geo, this.shadeMat);
    // light from the upper left: shadow falls down-right, further the higher the paper sits
    this.shade.position.set(lift * 0.32, -lift * 0.5, -0.5);
    this.inner.add(this.shade, this.body);
    this.group.add(this.inner);
    this.jitter = o.jitter ?? 1.4;
  }

  /** Attach something (tape, label) so it jitters with the paper. Coordinates: px from centre. */
  attach(obj: THREE.Object3D, x = 0, y = 0, z = 1): this {
    obj.position.set(x, y, z);
    if (obj.userData.sfx === 'tape') this.taped = true;
    this.inner.add(obj);
    return this;
  }

  /** Stop-motion jitter + opacity. Pure function of t. Each piece holds a pose for 1/JITTER_FPS s,
   *  with its own phase so the page never twitches all at once (user: less frequent shaking). */
  update(t: number) {
    const k = Math.floor(t * JITTER_FPS + hash(this.seed, 9) + 1e-6);
    const j = this.jitter * JITTER_AMP;
    this.inner.position.x = (hash(this.seed, k, 1) - 0.5) * 2 * j;
    this.inner.position.y = (hash(this.seed, k, 2) - 0.5) * 2 * j;
    this.inner.rotation.z = (hash(this.seed, k, 3) - 0.5) * 2 * j * 0.0022;
    this.bodyMat.uniforms.uOpacity.value = this.opacity;
    this.shadeMat.uniforms.uOpacity.value = this.opacity;
    this.group.visible = this.opacity > 0.001;
  }
}
