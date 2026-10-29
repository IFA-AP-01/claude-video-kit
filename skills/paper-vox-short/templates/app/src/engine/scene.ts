import * as THREE from 'three';
import type { Line, Word, Words } from './words';
import type { PostOpts } from './post';
import type { Cue } from './cues';

/** Native frame: vertical 9:16 Short. Every layout is in these pixels (origin centre, +y up). */
export const W = 1080;
export const H = 1920;
export const FPS = 30;

/** Shorts UI covers the bottom ~250 px and the right ~200 px (like/comment rail). Keep text
 *  inside this rect (pixel coords, origin centre, +y up). */
export const SAFE = { left: -W / 2 + 60, right: W / 2 - 200, top: H / 2 - 200, bottom: -H / 2 + 250 } as const;

export interface TimelineEntry {
  id: string;        // unique per entry, shown in the HUD and used in review notes
  scene: string;     // module name in src/scenes/
  start: number;
  end: number;
  params?: Record<string, unknown>;
  /** Crossfade in from the previous entry over this many seconds (default: hard cut). */
  fadeIn?: number;
}

export interface SceneCtx {
  renderer: THREE.WebGLRenderer;
  words: Words;
  entry: TimelineEntry;
  params: Record<string, unknown>;
}

/** Everything a scene may depend on. A frame is a pure function of `t`. */
export interface Frame {
  t: number;          // voice time (s)
  dt: number;         // frame duration (1/fps)
  lt: number;         // time since entry start
  p: number;          // 0..1 progress through the entry
  start: number;
  end: number;
  line: Line | null;  // line being spoken (null between lines)
  word: Word | null;  // word being spoken
  wordIndex: number;
}

export abstract class Scene {
  constructor(readonly ctx: SceneCtx) {}
  /** Load textures, build meshes, draw canvases. Must finish before the first render. */
  async init(): Promise<void> {}
  /** Draw the frame into `target` (null = canvas). */
  abstract render(f: Frame, target: THREE.WebGLRenderTarget | null): void;
  /** Per-frame overrides for the final post pass (grain, vignette), as a function of t. */
  postOpts(_t: number): PostOpts | null { return null; }
  /** SFX cues for this entry (export only; see engine/cues.ts). */
  cues(): Cue[] { return []; }
  dispose(): void {}
}

export type SceneClass = new (ctx: SceneCtx) => Scene;

/** Orthographic camera in W×H pixel units, origin at centre, +y up. */
export function pixelCamera(): THREE.OrthographicCamera {
  const c = new THREE.OrthographicCamera(-W / 2, W / 2, H / 2, -H / 2, -1000, 1000);
  c.position.z = 10;
  return c;
}
