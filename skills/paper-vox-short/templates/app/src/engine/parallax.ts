// 2.5D parallax for paper collages. A perspective camera looks down −z at the page; layers sit
// at fixed depths. `place()` positions an object by where it should appear on screen when the
// camera is at rest, so layouts are authored in screen px and depth only changes how much each
// layer slides when the camera trucks, dollies or rolls.
import * as THREE from 'three';
import { H, W } from './scene';

export const FOV = 40;
/** Camera distance at which the z = 0 plane maps 1:1 to screen px. */
export const D = H / 2 / Math.tan(((FOV / 2) * Math.PI) / 180);

/** Depths (world units, toward the camera = +). Back to front. */
export const Z = {
  BG: -900,       // coloured paper
  CLIP: -450,     // newspaper scraps, halftone circles
  PHOTO: -200,    // photo cut-outs, hero clippings
  DIAGRAM: 0,     // diagrams, headline strips
  FRONT: 120,     // stickers, stamps that sit on top
} as const;

/** Screen-scale factor of depth z: world size = screen size × k. */
export const depthK = (z: number) => (D - z) / D;

/** Put `obj` so that at rest it appears at screen (x, y) px with scale s. */
export function place<T extends THREE.Object3D>(obj: T, x: number, y: number, z: number, s = 1): T {
  const k = depthK(z);
  obj.position.set(x * k, y * k, z);
  obj.scale.setScalar(s * k);
  return obj;
}

/** Camera key: truck x/y (px at the z = 0 plane), push toward the page (px), roll (degrees). */
export interface CamKey { t: number; x?: number; y?: number; push?: number; roll?: number }

type Ch = 'x' | 'y' | 'push' | 'roll';

/** Keyframed camera: cubic Hermite through the keys (Catmull-Rom tangents over time, flat at
 *  the ends), plus an additive shake. Pure function of t. */
export class Rig {
  readonly cam = new THREE.PerspectiveCamera(FOV, W / H, 10, 6000);
  private keys: Required<CamKey>[];

  constructor(keys: CamKey[]) {
    this.keys = keys
      .map((k) => ({ t: k.t, x: k.x ?? 0, y: k.y ?? 0, push: k.push ?? 0, roll: k.roll ?? 0 }))
      .sort((a, b) => a.t - b.t);
    this.update(this.keys[0]?.t ?? 0);
  }

  private sample(t: number, ch: Ch): number {
    const ks = this.keys;
    if (!ks.length) return 0;
    if (t <= ks[0].t) return ks[0][ch];
    const n = ks.length;
    if (t >= ks[n - 1].t) return ks[n - 1][ch];
    let i = 0;
    while (t > ks[i + 1].t) i++;
    const a = ks[i], b = ks[i + 1], h = b.t - a.t;
    const tan = (j: number) => (j <= 0 || j >= n - 1 ? 0 : (ks[j + 1][ch] - ks[j - 1][ch]) / (ks[j + 1].t - ks[j - 1].t));
    const u = (t - a.t) / h, u2 = u * u, u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * a[ch] + (u3 - 2 * u2 + u) * h * tan(i)
         + (-2 * u3 + 3 * u2) * b[ch] + (u3 - u2) * h * tan(i + 1);
  }

  /** Keyed values at t with extra push (px) and shake offset (px) added on top. */
  values(t: number, extra: Partial<CamVals> = {}): CamVals {
    return {
      x: this.sample(t, 'x') + (extra.x ?? 0),
      y: this.sample(t, 'y') + (extra.y ?? 0),
      push: this.sample(t, 'push') + (extra.push ?? 0),
      roll: this.sample(t, 'roll') + (extra.roll ?? 0),
    };
  }

  update(t: number, extra: Partial<CamVals> = {}) { applyCam(this.cam, this.values(t, extra)); }
}

export interface CamVals { x: number; y: number; push: number; roll: number }

/** Put a camera at truck x/y (world units at z = 0), push toward the page, roll in degrees. */
export function applyCam(cam: THREE.PerspectiveCamera, v: CamVals) {
  cam.position.set(v.x, v.y, D - v.push);
  cam.rotation.set(0, 0, (v.roll * Math.PI) / 180);
  cam.updateMatrixWorld();
}
