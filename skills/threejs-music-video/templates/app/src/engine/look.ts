// The "clay look" composite for a 3D scene (optional; see references/scene-craft.md).
// The scene is drawn into `rt` (linear HalfFloat, 4× MSAA); `ao()` runs ground-truth ambient
// occlusion (three's GTAOPass, its own normal/depth pass) so every crease and contact gets the
// soft dark of a clay set; `composite()` multiplies the AO in, tone-maps (Neutral: identity below
// ~0.76, only highlights roll off), and lays the lyric canvas on top with *computed contrast*:
// words drawn pure white (#FFFFFF) become ink or paper, whichever reads better against the
// blurred background behind them (WCAG luminance, crossover ≈ 0.18 linear), and coloured words
// keep their hue but are darkened / lightened to at least 3:1. No text shadow, no halo.
// Deterministic: GTAO's denoise noise is replaced with a seeded texture (three's uses Math.random).
import * as THREE from 'three';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { mulberry32 } from './rand';
import { C } from './palette';
import { H, W } from './scene';

const VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const FRAG = /* glsl */ `
uniform sampler2D tScene;
uniform sampler2D tAO;
uniform sampler2D tLyr;
uniform sampler2D tDepth;
uniform float uAO;
uniform vec4 uFade;   // near, far, fade start, fade end (view distance)
uniform float uExposure;
uniform float uTone;
uniform float uHasLyr;
uniform float uLyrEnc;   // 1: lyric from a LyricLayer (premultiplied, sRGB-encoded)
uniform float uR;
uniform vec2 uPx;
uniform vec3 uInk;
uniform vec3 uPaper;
varying vec2 vUv;

vec3 neutral(vec3 color) {
  const float StartCompression = 0.8 - 0.04;
  const float Desaturation = 0.15;
  float x = min(color.r, min(color.g, color.b));
  float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
  color -= offset;
  float peak = max(color.r, max(color.g, color.b));
  if (peak < StartCompression) return color;
  float d = 1.0 - StartCompression;
  float newPeak = 1.0 - d * d / (peak + d - StartCompression);
  color *= newPeak / peak;
  float g = 1.0 - 1.0 / (Desaturation * (peak - newPeak) + 1.0);
  return mix(color, vec3(newPeak), g);
}
vec3 look(vec3 c) { c *= uExposure; return uTone > 0.5 ? neutral(c) : c; }
float lum(vec3 c) { return dot(max(c, 0.0), vec3(0.2126, 0.7152, 0.0722)); }
vec3 srgbLin(vec3 c) { return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c)); }

void main() {
  vec3 c = texture2D(tScene, vUv).rgb;
  float ao = texture2D(tAO, vUv).r;
  // AO only near the subject: far grazing ground / cloud seas get false occlusion (grey bands)
  float z = texture2D(tDepth, vUv).r;
  float dv = uFade.x * uFade.y / (uFade.y - z * (uFade.y - uFade.x));
  float aoK = uAO * (1.0 - smoothstep(uFade.z, uFade.w, dv));
  c = look(c * mix(1.0, ao, aoK));
  if (uHasLyr > 0.5) {
    vec4 L = texture2D(tLyr, vUv);
    if (L.a > 0.002) {
      // what the type sits on: background luminance over a ~uR px disk (golden-angle spiral)
      float s = 0.0;
      for (int i = 0; i < 24; i++) {
        float a = float(i) * 2.39996;
        float r = sqrt((float(i) + 0.5) / 24.0) * uR;
        s += lum(look(texture2D(tScene, vUv + vec2(cos(a), sin(a)) * r * uPx).rgb));
      }
      float Lb = s / 24.0;
      float light = smoothstep(0.172, 0.188, Lb);        // 1: light ground -> dark type (narrow: a wide blend
                                                   // turns the type mid-grey right where the ground is mid-grey)
      vec3 tc = uLyrEnc > 0.5 ? srgbLin(min(L.rgb / L.a, 1.0)) : L.rgb;
      vec3 col;
      if (min(tc.r, min(tc.g, tc.b)) > 0.97) {
        col = mix(uPaper, uInk, light);
      } else {
        float Lt = lum(tc);
        float dark = max(0.0, (Lb + 0.05) / 3.0 - 0.05);   // 3:1 against a light ground
        float lite = min(1.0, 3.0 * (Lb + 0.05) - 0.05);  // ... and a dark one
        vec3 dn = tc * min(1.0, dark / max(Lt, 1e-4));
        vec3 up = mix(tc, vec3(1.0), clamp((lite - Lt) / max(1.0 - Lt, 1e-4), 0.0, 1.0));
        col = mix(up, dn, light);
      }
      c = mix(c, col, L.a);
    }
  }
  gl_FragColor = vec4(c, 1.0);
}`;

export interface LookOpts {
  ao?: number;          // AO strength 0..1 (default 1)
  tone?: boolean;       // Neutral tone mapping (default true)
  exposure?: number;    // default 1
  lyric?: THREE.Texture | null;
  blur?: number;        // background sampling radius in px (default 70)
  layered?: boolean;    // `lyric` is a LyricLayer render (premultiplied, sRGB-encoded) instead of a canvas
}

export class Look {
  readonly rt: THREE.WebGLRenderTarget;
  private gtao: GTAOPass;
  private scene = new THREE.Scene();
  private cam = new THREE.Camera();
  private mat: THREE.ShaderMaterial;
  private white: THREE.DataTexture;

  /** `scale`: render resolution multiplier; `aoScale`: AO resolution relative to that. */
  constructor(private r: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera, scale = 1, aoScale = 0.5) {
    const w = Math.round(W * scale), h = Math.round(H * scale);
    this.rt = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: 4, depthBuffer: true, stencilBuffer: false });
    this.gtao = new GTAOPass(scene, camera, Math.round(w * aoScale), Math.round(h * aoScale));
    this.gtao.output = GTAOPass.OUTPUT.Off;
    // seeded rotation noise for the denoiser (three's version calls Math.random)
    {
      const N = 64, d = new Uint8Array(N * N * 4), rnd = mulberry32(5150);
      for (let i = 0; i < d.length; i++) d[i] = Math.floor(rnd() * 256);
      const tex = new THREE.DataTexture(d, N, N);
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.needsUpdate = true;
      (this.gtao as unknown as { pdMaterial: THREE.ShaderMaterial }).pdMaterial.uniforms.tNoise.value = tex;
    }
    this.white = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
    this.white.needsUpdate = true;
    this.mat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, depthTest: false, depthWrite: false,
      uniforms: {
        tScene: { value: this.rt.texture }, tAO: { value: this.white }, tLyr: { value: this.white }, tDepth: { value: this.white },
        uFade: { value: new THREE.Vector4(1, 2, 1e9, 2e9) },
        uAO: { value: 1 }, uExposure: { value: 1 }, uTone: { value: 1 }, uHasLyr: { value: 0 }, uLyrEnc: { value: 0 },
        uR: { value: 70 }, uPx: { value: new THREE.Vector2(1 / W, 1 / H) },
        uInk: { value: new THREE.Color(C.ink) }, uPaper: { value: new THREE.Color(C.paper) },
      },
    });
    const q = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mat);
    q.frustumCulled = false;
    this.scene.add(q);
  }

  /** Ink / paper the auto-coloured lyric words switch between. */
  setInk(ink: string, paper: string) {
    this.mat.uniforms.uInk.value.set(ink);
    this.mat.uniforms.uPaper.value.set(paper);
  }

  /**
   * Ambient occlusion for what was just drawn into `rt` from `camera`. `radius` / `thickness` are
   * in world units; `hide` are meshes that must not occlude (sky domes, glow sprites); AO fades out
   * between the view distances `fade[0]` and `fade[1]`.
   */
  ao(camera: THREE.PerspectiveCamera, radius: number, thickness: number, hide: THREE.Object3D[] = [], fade: [number, number] = [1e9, 2e9]) {
    const g = this.gtao;
    g.camera = camera;
    g.updateGtaoMaterial({ radius, thickness, distanceExponent: 1.4, scale: 1.15, samples: 16 });
    g.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 16 });
    const was = hide.map((o) => o.visible);
    hide.forEach((o) => { o.visible = false; });
    g.render(this.r, this.rt, this.rt, 0, false);
    hide.forEach((o, i) => { o.visible = was[i]; });
    this.mat.uniforms.tAO.value = g.gtaoMap;
    this.mat.uniforms.tDepth.value = (g as unknown as { depthTexture: THREE.Texture }).depthTexture;
    this.mat.uniforms.uFade.value.set(camera.near, camera.far, fade[0], fade[1]);
  }

  /** `rt` (+ AO, tone, lyrics) -> target. */
  composite(target: THREE.WebGLRenderTarget | null, o: LookOpts = {}) {
    const u = this.mat.uniforms;
    u.uAO.value = o.ao ?? 1;
    if (!(o.ao ?? 1)) { u.tAO.value = this.white; u.uFade.value.set(1, 2, 1e9, 2e9); }
    u.uTone.value = (o.tone ?? true) ? 1 : 0;
    u.uExposure.value = o.exposure ?? 1;
    u.uHasLyr.value = o.lyric ? 1 : 0;
    u.tLyr.value = o.lyric ?? this.white;
    u.uLyrEnc.value = o.layered ? 1 : 0;
    u.uR.value = o.blur ?? 70;
    this.r.setRenderTarget(target);
    this.r.render(this.scene, this.cam);
  }

  dispose() {
    this.rt.dispose();
    this.gtao.dispose();
  }
}

/**
 * Inverse of Neutral's toe: the linear colour that comes out of `composite` (tone on, exposure 1,
 * no AO) as `hex`. For flat or fully lit surfaces whose dark colours must stay as designed (cuts).
 */
export function untone(hex: string): THREE.Color {
  const c = new THREE.Color(hex);
  const o = Math.min(c.r, c.g, c.b);
  const m = o < 0.04 ? Math.sqrt(o / 6.25) : o + 0.04;
  return c.addScalar(m < 0.08 ? m - 6.25 * m * m : 0.04);
}
/** `untone` as a CSS colour (canvas fills). */
export const untoneCss = (hex: string) => `#${untone(hex).getHexString()}`;

/** Render layer of world-space lyric meshes (kept out of the main pass and of GTAO). */
export const LYRIC_LAYER = 1;

/**
 * Lyric type that lives in the 3D scene (printed on a floor, riding a chart, pinned to the camera)
 * but is coloured by `Look.composite`'s contrast pass: the meshes sit on LYRIC_LAYER, and `render`
 * draws only them (occluded by the rest of the scene) into a transparent target that `composite`
 * takes as `{ lyric, layered: true }`. Draw the words #FFFFFF (auto ink / paper) or in a hue.
 * Their canvases are uploaded premultiplied and left sRGB-encoded so edges un-premultiply exactly.
 */
export class LyricLayer {
  readonly rt: THREE.WebGLRenderTarget;
  private meshes: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>[] = [];
  private occ = new THREE.MeshBasicMaterial({ colorWrite: false });
  private clear = new THREE.Color();

  constructor(private r: THREE.WebGLRenderer, scale = 1) {
    this.rt = new THREE.WebGLRenderTarget(Math.round(W * scale), Math.round(H * scale),
      { type: THREE.HalfFloatType, samples: 4, depthBuffer: true, stencilBuffer: false });
  }

  add<T extends THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>>(mesh: T): T {
    mesh.layers.set(LYRIC_LAYER);
    const m = mesh.material;
    m.transparent = true;
    m.depthWrite = false;
    m.blending = THREE.CustomBlending;
    m.blendEquation = THREE.AddEquation;
    m.blendSrc = m.blendSrcAlpha = THREE.OneFactor;
    m.blendDst = m.blendDstAlpha = THREE.OneMinusSrcAlphaFactor;
    if (m.map) { m.map.colorSpace = THREE.NoColorSpace; m.map.premultiplyAlpha = true; m.map.needsUpdate = true; }
    this.meshes.push(mesh);
    return mesh;
  }

  /** Lyric layer of `scene` seen from `cam`; null when no lyric mesh is showing. */
  render(scene: THREE.Scene, cam: THREE.Camera, occlude = true): THREE.Texture | null {
    const shown = (o: THREE.Object3D | null): boolean => !o || (o.visible && shown(o.parent));
    let any = false;
    for (const mesh of this.meshes) {
      const m = mesh.material;
      m.color.setScalar(m.opacity);            // premultiplied: opacity scales the colour too
      if (m.opacity > 0.001 && shown(mesh)) any = true;
    }
    if (!any) return null;
    const r = this.r, bg = scene.background, mask = cam.layers.mask, ac = r.autoClear;
    r.getClearColor(this.clear);
    const ca = r.getClearAlpha();
    r.setRenderTarget(this.rt);
    r.setClearColor(0x000000, 0);
    r.clear();
    r.autoClear = false;
    scene.background = null;
    if (occlude) {
      cam.layers.set(0);
      scene.overrideMaterial = this.occ;
      r.render(scene, cam);
      scene.overrideMaterial = null;
    }
    cam.layers.set(LYRIC_LAYER);
    r.render(scene, cam);
    cam.layers.mask = mask;
    scene.background = bg;
    r.autoClear = ac;
    r.setClearColor(this.clear, ca);
    return this.rt.texture;
  }

  dispose() { this.rt.dispose(); }
}
