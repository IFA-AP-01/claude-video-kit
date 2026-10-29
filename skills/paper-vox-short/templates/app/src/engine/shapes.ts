// Shared 3D building blocks: rounded slabs (UI panels), SDF soft shadows, canvas textures.
import * as THREE from 'three';
import { C } from './palette';

export function roundedRectShape(w: number, h: number, r: number): THREE.Shape {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

/**
 * Rounded slab, back face at z=0, front face at z=depth. Groups: 0 = caps (uv 0..1 over
 * the w×h rect, so a canvas texture maps 1:1), 1 = sides.
 */
export function slabGeometry(w: number, h: number, depth: number, r: number): THREE.ExtrudeGeometry {
  const g = new THREE.ExtrudeGeometry(roundedRectShape(w, h, r), {
    depth, bevelEnabled: false, curveSegments: 10,
  });
  const pos = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / w + 0.5, pos.getY(i) / h + 0.5);
  uv.needsUpdate = true;
  return g;
}

export function slab(w: number, h: number, depth: number, r: number,
                     cap: THREE.Material, side: THREE.Material): THREE.Mesh {
  return new THREE.Mesh(slabGeometry(w, h, depth, r), [cap, side]);
}

const SHADOW_FRAG = /* glsl */ `
uniform vec2 uSize;
uniform float uRadius;
uniform float uBlur;
uniform float uOpacity;
uniform vec3 uColor;
varying vec2 vP;
float sdRound(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}
void main() {
  float d = sdRound(vP, uSize * 0.5, uRadius);
  float a = 1.0 - smoothstep(-uBlur, uBlur, d);
  gl_FragColor = vec4(uColor, a * a * (3.0 - 2.0 * a) * uOpacity);
}`;

const SHADOW_VERT = /* glsl */ `
uniform vec2 uExt;
varying vec2 vP;
void main() {
  vP = position.xy * uExt;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(vec3(vP, position.z), 1.0);
}`;

/** Blurred rounded-rect shadow (a flat plane in its local XY). */
export class SoftShadow extends THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial> {
  constructor(color: string = C.shadow) {
    super(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({
      vertexShader: SHADOW_VERT, fragmentShader: SHADOW_FRAG, transparent: true, depthWrite: false,
      uniforms: {
        uSize: { value: new THREE.Vector2() }, uExt: { value: new THREE.Vector2() },
        uRadius: { value: 0 }, uBlur: { value: 1 }, uOpacity: { value: 0 },
        uColor: { value: new THREE.Color(color) },
      },
    }));
    this.frustumCulled = false;
  }

  set(w: number, h: number, radius: number, blur: number, opacity: number) {
    const u = this.material.uniforms;
    u.uSize.value.set(w, h);
    u.uExt.value.set(w + 4 * blur, h + 4 * blur);
    u.uRadius.value = Math.min(radius + blur * 0.5, Math.min(w, h) / 2);
    u.uBlur.value = Math.max(0.5, blur);
    u.uOpacity.value = opacity;
    this.visible = opacity > 0.001;
  }
}

/** Shadow params for a panel floating `z` px above the floor (key light from top-left). */
export function shadowFor(z: number, k = 1) {
  return {
    dx: 0.22 * z, dy: -0.42 * z,
    blur: 6 + 0.55 * z,
    opacity: k * 0.26 * Math.max(0, 1 - z / 900),
  };
}

/** A 2D canvas drawn at `scale`× and exposed as an sRGB texture in w×h logical px. */
export class CanvasSurface {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  readonly tex: THREE.CanvasTexture;

  constructor(readonly w: number, readonly h: number, readonly scale = 2, mipmaps = true) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = Math.round(w * scale);
    this.canvas.height = Math.round(h * scale);
    this.ctx = this.canvas.getContext('2d')!;
    this.tex = new THREE.CanvasTexture(this.canvas);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.tex.anisotropy = 8;
    this.tex.generateMipmaps = mipmaps;
    this.tex.minFilter = mipmaps ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
  }

  /** Reset transform to logical px and clear. Call tex.needsUpdate (via commit) after drawing. */
  begin(bg?: string) {
    const g = this.ctx;
    g.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    g.globalAlpha = 1;
    if (bg) { g.fillStyle = bg; g.fillRect(0, 0, this.w, this.h); } else g.clearRect(0, 0, this.w, this.h);
    return g;
  }

  commit() { this.tex.needsUpdate = true; }
}
