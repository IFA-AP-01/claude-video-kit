// Matte clay materials: a MeshStandardMaterial whose albedo is mottled and
// whose normal is bumped by a seeded 3D value noise taken in object (or world) space — the soft
// thumb-pressed look of plasticine instead of the flat colour of a raw engine primitive. The noise
// is a pure function of position (no time), and fades out where it would shimmer (sub-pixel).
import * as THREE from 'three';

export interface ClayOpts {
  rough?: number;      // roughness (default 0.92: matte)
  freq?: number;       // noise cells per world unit (default 0.18)
  bump?: number;       // bump height (default 0.5)
  mottle?: number;     // albedo variation ±, 0..1 (default 0.05)
  tint?: string;       // second colour for large soft patches (ground, clouds)
  patch?: number;      // how much of `tint` (0..1)
  patchFreq?: number;  // patch cells per world unit
  sheen?: number;      // soft light edge (velvet), 0..1
  world?: boolean;     // noise in world space (big static props, ground, instances) instead of object space
  // bump slope ≈ bump × freq: keep the product near 0.06–0.1 whatever the scale
  emissive?: string;
}

const NOISE = /* glsl */ `
float clayH(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float clayN(vec3 x) {
  vec3 i = floor(x), f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(clayH(i), clayH(i + vec3(1, 0, 0)), f.x), mix(clayH(i + vec3(0, 1, 0)), clayH(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(clayH(i + vec3(0, 0, 1)), clayH(i + vec3(1, 0, 1)), f.x), mix(clayH(i + vec3(0, 1, 1)), clayH(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
float clayF(vec3 p) {
  float a = 0.5, s = 0.0;
  for (int i = 0; i < 4; i++) { s += a * clayN(p); p = p * 2.03 + vec3(1.7, 9.2, 3.1); a *= 0.5; }
  return s;
}`;

export function clay(color: string, o: ClayOpts = {}): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ color, roughness: o.rough ?? 0.92, metalness: 0 });
  if (o.emissive) m.emissive.set(o.emissive);
  const u = {
    uClayFreq: { value: o.freq ?? 0.18 },
    uClayBump: { value: o.bump ?? 0.5 },
    uClayMottle: { value: o.mottle ?? 0.05 },
    uClayTint: { value: new THREE.Color(o.tint ?? color) },
    uClayPatch: { value: o.patch ?? 0 },
    uClayPatchFreq: { value: o.patchFreq ?? 0.002 },
    uClaySheen: { value: o.sheen ?? 0.12 },
  };
  const world = !!o.world;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vClayP;')
      .replace('#include <begin_vertex>', world
        ? `#include <begin_vertex>
#ifdef USE_INSTANCING
vClayP = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
#else
vClayP = (modelMatrix * vec4(transformed, 1.0)).xyz;
#endif`
        : '#include <begin_vertex>\nvClayP = transformed;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vClayP;
uniform float uClayFreq, uClayBump, uClayMottle, uClayPatch, uClayPatchFreq, uClaySheen;
uniform vec3 uClayTint;
${NOISE}`)
      .replace('#include <map_fragment>', `#include <map_fragment>
vec3 clayQ = vClayP * uClayFreq;
float clayFade = 1.0 - smoothstep(0.25, 0.8, length(fwidth(clayQ)));
float clayV = clayF(clayQ);
diffuseColor.rgb *= 1.0 + uClayMottle * 2.0 * (clayV - 0.5) * (0.4 + 0.6 * clayFade);
if (uClayPatch > 0.0) {
  float pn = clayF(vClayP * uClayPatchFreq + 31.7);
  diffuseColor.rgb = mix(diffuseColor.rgb, uClayTint, uClayPatch * smoothstep(0.38, 0.66, pn));
}`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
{
  float hh = clayV * uClayBump * clayFade;
  vec3 dpx = dFdx(-vViewPosition), dpy = dFdy(-vViewPosition);
  float dhx = dFdx(hh), dhy = dFdy(hh);
  vec3 r1 = cross(dpy, normal), r2 = cross(normal, dpx);
  float det = dot(dpx, r1);
  vec3 grad = sign(det) * (dhx * r1 + dhy * r2);
  normal = normalize(abs(det) * normal - grad);
}`)
      .replace('#include <opaque_fragment>', `outgoingLight += uClaySheen * pow(1.0 - saturate(dot(normal, normalize(vViewPosition))), 2.5) * diffuseColor.rgb * (0.35 + 0.65 * totalDiffuse);
#include <opaque_fragment>`);
  };
  m.customProgramCacheKey = () => `clay${world ? 'W' : 'O'}`;
  return m;
}
