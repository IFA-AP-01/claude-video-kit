import * as THREE from 'three';
import type { AudioData, AudioSample, Section } from './audio';
import type { Line, Lyrics, Word } from './lyrics';
import type { PostOpts } from './post';

/** `?portrait`: a vertical 9:16 cut (Shorts / TikTok). Fixed per page load, read before anything
 *  sizes itself, so every W/H below is the portrait frame in that mode. */
export const PORTRAIT = typeof location !== 'undefined' && new URLSearchParams(location.search).has('portrait');
export const W = PORTRAIT ? 1080 : 1920;
export const H = PORTRAIT ? 1920 : 1080;

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
  audio: AudioData;
  lyrics: Lyrics;
  entry: TimelineEntry;
  params: Record<string, unknown>;
}

/** Everything a scene may depend on. A frame is a pure function of `t`. */
export interface Frame {
  t: number;          // song time (s)
  dt: number;         // frame duration (1/fps); for motion blur shutters
  lt: number;         // time since entry start
  p: number;          // 0..1 progress through the entry
  start: number;
  end: number;
  beat: number;       // beat index
  beatPhase: number;  // 0..1 within the beat
  bar: number;        // bar index from first downbeat
  barPhase: number;   // 0..1 within the bar
  beatInBar: number;  // 0..beatsPerBar-1
  section: Section;
  a: AudioSample;     // envelopes at t
  line: Line | null;  // line being sung (null between lines)
  word: Word | null;  // word being sung
  wordIndex: number;
}

export abstract class Scene {
  constructor(readonly ctx: SceneCtx) {}
  /** Load textures, build meshes, sync all text. Must finish before the first render. */
  async init(): Promise<void> {}
  /** Draw the frame into `target` (null = canvas). */
  abstract render(f: Frame, target: THREE.WebGLRenderTarget | null): void;
  /** Per-frame overrides for the final post pass (grain, vignette), as a function of t. */
  postOpts(_t: number): PostOpts | null { return null; }
  dispose(): void {}
}

export type SceneClass = new (ctx: SceneCtx) => Scene;

/** Orthographic camera in W×H pixel units, origin at centre, +y up. */
export function pixelCamera(): THREE.OrthographicCamera {
  const c = new THREE.OrthographicCamera(-W / 2, W / 2, H / 2, -H / 2, -1000, 1000);
  c.position.z = 10;
  return c;
}
