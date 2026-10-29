// Seeded randomness. Never use Math.random for anything visible (see CLAUDE.md §1).

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stateless hash of any numbers -> [0,1). Same inputs, same output, on every frame. */
export function hash(...xs: number[]): number {
  let h = 2166136261 >>> 0;
  for (const x of xs) {
    h = Math.imul(h ^ (Math.floor(x * 1000) | 0), 16777619);
    h ^= h >>> 13;
    h = Math.imul(h, 0x5bd1e995);
    h ^= h >>> 15;
  }
  return (h >>> 0) / 4294967296;
}

/** Periodic 2D value noise in [0,1): lattice wraps every `period` cells (tiling textures). */
export function vnoise2(x: number, y: number, period: number, seed = 0): number {
  const xi = Math.floor(x), yi = Math.floor(y);
  const fx = x - xi, fy = y - yi;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const m = (v: number) => ((v % period) + period) % period;
  const h = (a: number, b: number) => hash(m(a), m(b), seed);
  const a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

/** 1D value noise in [-1,1] (smooth, seeded): torn-edge outlines, hand-drawn wobble. */
export function vnoise1(x: number, seed = 0): number {
  const i = Math.floor(x), f = x - i;
  const u = f * f * (3 - 2 * f);
  return (hash(i, seed) * (1 - u) + hash(i + 1, seed) * u) * 2 - 1;
}

/** Stop-motion clock: t quantised to 12 fps ("on twos" at 24). */
export const STEP_FPS = 12;
export const stepped = (t: number) => Math.floor(t * STEP_FPS + 1e-6) / STEP_FPS;
