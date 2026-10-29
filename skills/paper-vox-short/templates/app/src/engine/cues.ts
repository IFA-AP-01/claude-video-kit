// SFX cue registry. Animation helpers report "a sound lands here" with the very T they animate
// on (pops, headline slaps, stamp slams, camera glides), so the mix in audio/ follows the picture
// when the narration is retimed. Nothing is recorded unless a collection is running (export
// `__mv.cues()` → `npm run cues` → data/sfx_cues.json); in preview `cue()` returns at once.
import * as THREE from 'three';
import { depthK } from './parallax';

export type CueKind = 'paper' | 'tape' | 'stamp' | 'slap' | 'whoosh' | 'tick' | 'type' | 'cross' | 'fan' | 'hiss' | 'pop';

export interface Cue {
  t: number;          // voice_master clock, s (3 decimals)
  kind: CueKind;
  scene: string;      // timeline entry id
  dur?: number;       // sustained kinds only
  x?: number;         // −1 … 1: screen x / 540, for a slight pan
  gain?: number;      // 0.3 … 1: minor vs hero items
}

export interface CueOpts { dur?: number; x?: number; gain?: number; id?: unknown }

interface Sink { scene: string; ox: number; list: Cue[]; seen: Set<string> }
let sink: Sink | null = null;

const ids = new WeakMap<object, number>();
let nextId = 1;
const idOf = (o: unknown): string => {
  if (o === null || typeof o !== 'object') return String(o ?? '');
  let i = ids.get(o);
  if (i === undefined) ids.set(o, (i = nextId++));
  return `#${i}`;
};
const r = (v: number, d: number) => Math.round(v * 10 ** d) / 10 ** d;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/** True while a collection runs: guard any extra work done only to report cues. */
export const cuesOn = () => sink !== null;

/** A sound belongs at T. Deduped by (kind, T to 10 ms, id), so per-frame calls are fine. */
export function cue(kind: CueKind, T: number, o: CueOpts = {}) {
  if (!sink || !Number.isFinite(T)) return;
  const key = `${kind}|${Math.round(T * 100)}|${idOf(o.id)}`;
  if (sink.seen.has(key)) return;
  sink.seen.add(key);
  const c: Cue = { t: r(T, 3), kind, scene: sink.scene };
  if (o.dur !== undefined) c.dur = r(Math.max(0, o.dur), 3);
  if (o.x !== undefined) c.x = r(clamp(o.x, -1, 1), 2);
  if (o.gain !== undefined) c.gain = r(clamp(o.gain, 0.3, 1), 2);
  sink.list.push(c);
}

const _v = new THREE.Vector3();
/** Resting screen x of an object in [−1, 1] (its beat's place on the table removed). */
export function screenX(o: THREE.Object3D): number {
  if (!sink) return 0;
  o.updateWorldMatrix(true, false);
  _v.setFromMatrixPosition(o.matrixWorld);
  return (_v.x - sink.ox) / depthK(_v.z) / (1080 / 2);
}

/** Run `fn` (scene updates) with cues going to `list`. `ox` = the beat's x on the table. */
export function collectCues(scene: string, ox: number, list: Cue[], seen: Set<string>, fn: () => void) {
  const prev = sink;
  sink = { scene, ox, list, seen };
  try { fn(); } finally { sink = prev; }
}

/** One-shot kinds that pile up when a group of pieces lands together. */
const MERGE: ReadonlySet<CueKind> = new Set<CueKind>(['paper', 'pop', 'tape', 'slap']);

/** Sort by t; same-kind one-shots within 80 ms of a group's first cue become one cue, gain 1. */
export function mergeCues(list: Cue[], win = 0.08): Cue[] {
  const s = [...list].sort((a, b) => a.t - b.t || a.kind.localeCompare(b.kind));
  const out: Cue[] = [];
  const open = new Map<string, { c: Cue; n: number; xs: number[] }>();
  for (const c of s) {
    const k = `${c.scene}|${c.kind}`;
    const g = open.get(k);
    if (MERGE.has(c.kind) && g && c.t - g.c.t <= win) {
      g.n++;
      if (c.x !== undefined) g.xs.push(c.x);
      g.c.gain = 1;
      g.c.x = r(g.xs.reduce((a, b) => a + b, 0) / Math.max(1, g.xs.length), 2);
      continue;
    }
    const copy = { ...c };
    out.push(copy);
    open.set(k, { c: copy, n: 1, xs: c.x !== undefined ? [c.x] : [] });
  }
  return out;
}
