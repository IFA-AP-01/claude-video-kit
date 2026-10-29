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
