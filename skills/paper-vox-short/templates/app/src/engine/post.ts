// Offscreen compositing. Scenes draw (linear, HalfFloat, 4× MSAA) into rtA; a crossfade
// blends rtB over it; the final pass converts to sRGB, applies an aged-print grade (warm
// blacks, cream whites, worn brown edge, 12 fps flicker) and seeded film grain. Grain and
// flicker depend only on pixel + frame index, so preview and export are identical.
import * as THREE from 'three';
import { H, W } from './scene';
import { NOISE_GLSL } from './paper';

const VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const COPY = /* glsl */ `
uniform sampler2D tSrc;
uniform float uOpacity;
varying vec2 vUv;
void main() { gl_FragColor = vec4(texture2D(tSrc, vUv).rgb, uOpacity); }`;

const FINAL = /* glsl */ `
uniform sampler2D tSrc;
uniform float uFrame;
uniform float uGrain;
uniform float uVignette;
varying vec2 vUv;

uint pcg(uint v) {
  uint s = v * 747796405u + 2891336453u;
  uint w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u;
  return (w >> 22u) ^ w;
}
float rnd(uvec3 p) { return float(pcg(p.x ^ pcg(p.y ^ pcg(p.z)))) / 4294967295.0; }
${NOISE_GLSL}

void main() {
  vec3 c = texture2D(tSrc, vUv).rgb;
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
  vec3 d = gl_FragColor.rgb;
  // aged print grade (display space): a touch less saturation, warm lifted blacks, cream whites
  float l0 = dot(d, vec3(0.299, 0.587, 0.114));
  d = mix(vec3(l0), d, 0.93);
  d = mix(vec3(0.045, 0.038, 0.03), vec3(1.0, 0.978, 0.925), d);
  // worn, slightly browned edge: an irregular warm vignette fixed to the frame
  vec2 q = vUv - 0.5;
  q.x *= ${(W / H).toFixed(6)};
  float rr = length(q) + 0.07 * (fbm(vUv * vec2(5.0, 9.0) + 2.3) - 0.5);
  float edge = smoothstep(0.40, 1.05, rr);
  d *= mix(vec3(1.0), vec3(0.78, 0.70, 0.60), edge * uVignette * 2.0);
  // tiny exposure flicker on the 12 fps stop-motion clock
  float fk = floor(uFrame * 0.4 + 1e-3);
  d *= 1.0 + 0.008 * (rnd(uvec3(3u, 5u, uint(fk))) - 0.5);
  // triangular-distributed film grain, strongest in the mid-tones
  uvec3 p = uvec3(uvec2(gl_FragCoord.xy), uint(uFrame));
  float n = rnd(p) + rnd(p + uvec3(0u, 0u, 7919u)) - 1.0;
  float l = dot(d, vec3(0.299, 0.587, 0.114));
  gl_FragColor.rgb = d + n * uGrain * (0.45 + 2.2 * l * (1.0 - l));
}`;

export interface PostOpts {
  grain?: number;
  vignette?: number;
}

export class Post {
  readonly rtA: THREE.WebGLRenderTarget;
  readonly rtB: THREE.WebGLRenderTarget;
  private scene = new THREE.Scene();
  private cam = new THREE.Camera();
  private quad: THREE.Mesh;
  private copy: THREE.ShaderMaterial;
  private final: THREE.ShaderMaterial;

  constructor(private r: THREE.WebGLRenderer, scale = 1) {
    const mk = () => new THREE.WebGLRenderTarget(W * scale, H * scale, {
      type: THREE.HalfFloatType, samples: 4, depthBuffer: true, stencilBuffer: false,
    });
    this.rtA = mk();
    this.rtB = mk();
    this.copy = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: COPY, transparent: true, depthTest: false, depthWrite: false,
      uniforms: { tSrc: { value: null }, uOpacity: { value: 1 } },
    });
    this.final = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FINAL, depthTest: false, depthWrite: false,
      uniforms: { tSrc: { value: this.rtA.texture }, uFrame: { value: 0 }, uGrain: { value: 0.04 },
                  uVignette: { value: 0.17 } },
    });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.final);
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);
  }

  /** Blend rtB over rtA with opacity k (crossfade). */
  blendB(k: number) {
    const r = this.r;
    this.copy.uniforms.tSrc.value = this.rtB.texture;
    this.copy.uniforms.uOpacity.value = k;
    this.quad.material = this.copy;
    r.setRenderTarget(this.rtA);
    const ac = r.autoClear;
    r.autoClear = false;
    r.render(this.scene, this.cam);
    r.autoClear = ac;
  }

  /** rtA -> canvas: sRGB, aged-print grade, worn edge, grain. */
  finish(frameIndex: number, o: PostOpts = {}) {
    const u = this.final.uniforms;
    u.uFrame.value = frameIndex;
    u.uGrain.value = o.grain ?? 0.04;
    u.uVignette.value = o.vignette ?? 0.17;
    this.quad.material = this.final;
    this.r.setRenderTarget(null);
    this.r.render(this.scene, this.cam);
  }
}
