// Rubber stamp: THẬT / GIẢ / CẤM / CHƯA KIỂM CHỨNG / dates. Text + double border drawn once on a
// canvas; the shader inks it with uneven pressure, speckle voids and a pressed rim. `slam()`
// drops it from above onto the page at T, `shake()` gives the camera kick for the impact.
import * as THREE from 'three';
import { canvas2d } from './text';
import { CFONT } from './palette';
import { NOISE_GLSL } from './paper';
import { clamp, spring } from './ease';
import { hash } from './rand';
import { cue, screenX } from './cues';

export interface StampLine { text: string; size: number; font?: string; weight?: number; spacing?: number }

const VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const FRAG = /* glsl */ `
uniform sampler2D tMask;
uniform vec2 uSize;
uniform vec3 uInk;
uniform float uSeed, uOpacity;
varying vec2 vUv;
${NOISE_GLSL}
void main() {
  float m = texture2D(tMask, vUv).a;
  if (m <= 0.003) discard;
  vec2 px = vUv * uSize;
  float pressure = 0.82 + 0.4 * fbm(px * 0.012 + uSeed);                 // uneven inking
  float voids = smoothstep(0.24, 0.36, fbm(px * 0.09 + uSeed * 2.0));     // speckle gaps
  float grit = step(0.1, vnoise(px * 0.7 + uSeed * 5.0));                 // fine dry spots
  float a = m * clamp(pressure, 0.0, 1.0) * mix(0.18, 1.0, voids) * mix(0.6, 1.0, grit);
  gl_FragColor = vec4(uInk, clamp(a, 0.0, 1.0) * 0.96 * uOpacity);
}`;

export class Stamp {
  readonly group = new THREE.Group();
  readonly w: number;
  readonly h: number;
  private mat: THREE.ShaderMaterial;
  private rot: number;

  constructor(lines: StampLine[], ink: string, rotDeg = -12, seed = 3) {
    const pad = 34, gap = 10, border = 9;
    const measure = canvas2d(4, 4).g;
    const fontOf = (l: StampLine) => `${l.weight ?? 400} ${l.size}px ${l.font ?? CFONT.head}`;
    const dims = lines.map((l) => {
      measure.font = fontOf(l);
      measure.letterSpacing = `${l.spacing ?? 0}px`;
      const m = measure.measureText(l.text);
      return { w: m.width, asc: m.actualBoundingBoxAscent, desc: m.actualBoundingBoxDescent };
    });
    const innerW = Math.max(...dims.map((d) => d.w));
    const innerH = dims.reduce((s, d) => s + d.asc + d.desc, 0) + gap * (lines.length - 1);
    this.w = Math.ceil(innerW + 2 * pad + 2 * border);
    this.h = Math.ceil(innerH + 2 * pad + 2 * border);
    const { c, g } = canvas2d(this.w, this.h);
    g.strokeStyle = g.fillStyle = '#fff';
    const rr = (x: number, y: number, w: number, h: number, r: number, lw: number) => {
      g.lineWidth = lw;
      g.beginPath();
      g.roundRect(x, y, w, h, r);
      g.stroke();
    };
    rr(border / 2 + 2, border / 2 + 2, this.w - border - 4, this.h - border - 4, 16, border);
    rr(border + 12, border + 12, this.w - 2 * border - 24, this.h - 2 * border - 24, 8, 3.5);
    let y = border + pad;
    lines.forEach((l, i) => {
      const d = dims[i];
      g.font = fontOf(l);
      g.letterSpacing = `${l.spacing ?? 0}px`;
      g.textAlign = 'center';
      g.textBaseline = 'alphabetic';
      // letterSpacing adds trailing space after the last glyph: shift back by half of it
      g.fillText(l.text, this.w / 2 + (l.spacing ?? 0) / 2, y + d.asc);
      y += d.asc + d.desc + gap;
    });
    const tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 4;
    this.mat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthTest: false, depthWrite: false,
      uniforms: {
        tMask: { value: tex }, uSize: { value: new THREE.Vector2(this.w, this.h) },
        uInk: { value: new THREE.Color(ink) }, uSeed: { value: hash(seed, 13) * 40 }, uOpacity: { value: 1 },
      },
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(this.w, this.h), this.mat);
    this.group.add(mesh);
    this.rot = (rotDeg * Math.PI) / 180;
    this.group.rotation.z = this.rot;
  }

  /** Falls in over 0.14 s, lands at T with a squash, then sits. Hidden before. */
  slam(t: number, T: number, scale = 1) {
    cue('stamp', T, { id: this, x: screenX(this.group), gain: 1 });
    const fall = 0.14;
    const k = clamp((t - (T - fall)) / fall);
    const visible = t >= T - fall;
    this.group.visible = visible;
    if (!visible) return;
    const s = t < T ? 1 + 1.6 * (1 - k * k) : 1 - 0.07 * spring(t - T, 0.09, 30);
    this.group.scale.setScalar(scale * s);
    this.group.rotation.z = this.rot + (t < T ? 0.18 * (1 - k) : 0);
    this.mat.uniforms.uOpacity.value = t < T ? 0.35 + 0.5 * k : 1;
  }

  /** Static (no animation) at `opacity`. */
  show(opacity = 1) {
    this.group.visible = opacity > 0.001;
    this.group.scale.setScalar(1);
    this.group.rotation.z = this.rot;
    this.mat.uniforms.uOpacity.value = opacity;
  }
}

/** Camera kick after an impact at T: px offset {x, y}. Zero before T. */
export function shake(t: number, T: number, amp = 16, seed = 0): { x: number; y: number } {
  const tau = t - T;
  if (tau < 0) return { x: 0, y: 0 };
  const e = Math.exp(-tau / 0.09) * amp;
  const ph = hash(seed, 5) * 6.28;
  return { x: e * Math.sin(tau * 71 + ph), y: e * Math.cos(tau * 57 + ph) };
}
