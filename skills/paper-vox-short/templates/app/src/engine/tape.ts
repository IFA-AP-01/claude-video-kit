// Masking tape: a semi-transparent cream strip with torn zig-zag ends, lengthwise fibre streaks
// and slightly darker long edges. Purely procedural (no texture); attach it to a Cutout so it
// jitters with the paper it holds.
import * as THREE from 'three';
import { hash } from './rand';
import { NOISE_GLSL } from './paper';
import { C } from './palette';

const VERT = /* glsl */ `
varying vec2 vPx;
uniform vec2 uSize;
void main() { vPx = uv * uSize; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const FRAG = /* glsl */ `
uniform vec2 uSize;
uniform vec3 uColor;
uniform float uAlpha, uSeed, uOpacity;
varying vec2 vPx;
${NOISE_GLSL}
float tri(float x) { return abs(fract(x) - 0.5) * 2.0; }
void main() {
  vec2 p = vPx;
  // torn ends: irregular zig-zag across the width
  float zl = 4.0 + 7.0 * tri(p.y / 9.0 + uSeed) + 4.0 * vnoise(vec2(p.y * 0.21, uSeed));
  float zr = 4.0 + 7.0 * tri(p.y / 8.0 + uSeed * 1.7) + 4.0 * vnoise(vec2(p.y * 0.19, uSeed + 9.0));
  float aa = 0.8;
  float m = smoothstep(zl - aa, zl + aa, p.x) * (1.0 - smoothstep(uSize.x - zr - aa, uSize.x - zr + aa, p.x));
  if (m <= 0.003) discard;
  // lengthwise streaks + crinkles
  float streak = vnoise(vec2(p.x * 0.012, p.y * 0.45) + uSeed) - 0.5;
  float crinkle = vnoise(vec2(p.x * 0.09 + p.y * 0.03, p.y * 0.02) + uSeed * 2.0) - 0.5;
  float edge = smoothstep(uSize.y * 0.5 - 3.0, uSize.y * 0.5, abs(p.y - uSize.y * 0.5));
  vec3 c = uColor * (1.0 + 0.07 * streak + 0.05 * crinkle - 0.12 * edge);
  float a = uAlpha * (0.92 + 0.16 * streak) + 0.18 * edge;
  gl_FragColor = vec4(c, m * clamp(a, 0.0, 1.0) * uOpacity);
}`;

export class Tape {
  readonly mesh: THREE.Mesh;
  private mat: THREE.ShaderMaterial;

  /** w×h px, rotation in degrees. */
  constructor(w: number, h = 46, rotDeg = 0, seed = 1, color: string = C.tape, alpha = 0.66) {
    this.mat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthTest: false, depthWrite: false,
      uniforms: {
        uSize: { value: new THREE.Vector2(w, h) }, uColor: { value: new THREE.Color(color) },
        uAlpha: { value: alpha }, uSeed: { value: hash(seed, 41) * 50 }, uOpacity: { value: 1 },
      },
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), this.mat);
    this.mesh.rotation.z = (rotDeg * Math.PI) / 180;
    this.mesh.userData.sfx = 'tape';   // a Cutout it is attached to cues a rip after its pop
  }

  set opacity(v: number) { this.mat.uniforms.uOpacity.value = v; this.mesh.visible = v > 0.001; }
}
