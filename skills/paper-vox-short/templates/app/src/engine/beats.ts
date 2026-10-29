// Base for story scenes made of beats: one timeline entry = several beats, each a flat colour,
// its own group of paper pieces and its own camera rig. Beat starts and every pop/slam time
// come from the narration (`at()` / `cutAt()`), never hard-coded seconds. Captions for the
// entry come from data/captions.json and are drawn camera-locked in the overlay.
// One take: the beats are laid out side by side on one big paper table (each beat its own
// coloured sheet) and a single camera glides from beat to beat on the cut word, so a scene plays
// as one continuous move instead of swapping beats in place.
import * as THREE from 'three';
import { Scene, pixelCamera, H, W, FPS, type Frame } from './scene';
import { PaperBg } from './paper';
import { Cutout } from './cutout';
import { CaptionTrack } from './caption';
import { captionsIn } from './captions';
import { Rig, Z, depthK, applyCam, FOV, type CamVals } from './parallax';
import { stepped } from './rand';
import { lerp, prog } from './ease';
import { cue, cuesOn, screenX, collectCues, type Cue, type CueKind } from './cues';

export interface CamExtra { x?: number; y?: number; push?: number; roll?: number }
export interface Beat {
  t0: number; color: string; group: THREE.Group; rig: Rig; update(t: number): CamExtra;
  /** Where this beat sits on the table (world units at z = 0); default: the staircase path. */
  at?: { x: number; y: number };
}

/** Steps between consecutive beats: a strip of sheets running right, gently zig-zagging. Each
 *  step is larger than what any layer shows at rest, so neighbours stay off-frame until the
 *  camera travels (vertical steps would need ~3000 units: too fast a whip for a short glide). */
const STEPS: [number, number][] = [[1900, -120], [1900, 120]];
/** Glide window around a beat change: leave just before the cut (the beat's last pop usually
 *  lands within 0.3 s of it), land soon after so the next beat's first pop is seen arriving. */
const LEAD = 0.3, LAND = 0.55;
/** How far the camera pulls back mid-glide (px) and how much it banks (degrees). */
const LIFT = 260, BANK = 1.6;

/** Sine in-out: gentle start and stop, lower peak speed than cubic for long travels. */
const glide = (x: number) => 0.5 - 0.5 * Math.cos(Math.PI * x);

/** Stop-motion pop on the 12 fps clock: 0 before T, then 1.3 → 0.92 → 1.04 → 1. */
export function pop(t: number, T: number): number {
  if (t < T) return 0;
  const a = stepped(t) - T;
  return a < 1 / 12 ? 1.3 : a < 2 / 12 ? 0.92 : a < 3 / 12 ? 1.04 : 1;
}

/** Cut-out that pops in at T, keeping its base scale. */
export function popCut(c: Cutout, t: number, T: number, base = 1) {
  if (cuesOn()) {
    // bigger pieces louder: a full-width print ≈ 1, a small tag ≈ 0.5
    const x = screenX(c.group), gain = 0.35 + (Math.sqrt(c.w * c.h) * base) / 700;
    cue(c.sfx, T, { id: c, x, gain, ...(c.sfx === 'cross' ? { dur: 0.2 } : {}) });
    if (c.taped) cue('tape', T + 2 / 12, { id: c, x, gain: 0.7 });   // taped down as it settles
  }
  const s = pop(t, T);
  c.opacity = s > 0 ? 1 : 0;
  c.group.scale.setScalar(base * Math.max(s, 0.001));
  c.update(t);
}

/** Same for any object (tape, flat plane, stamp holder). `sfx` null = silent. */
export function popObj(o: THREE.Object3D, t: number, T: number, base = 1, sfx: CueKind | null = 'paper') {
  if (sfx) cue(sfx, T, { id: o, x: screenX(o), gain: 0.6 });
  const s = pop(t, T);
  o.visible = s > 0;
  o.scale.setScalar(base * Math.max(s, 0.001));
}

export abstract class BeatScene extends Scene {
  protected world = new THREE.Scene();
  protected overlay = new THREE.Scene();
  protected ocam = pixelCamera();
  protected bg!: PaperBg;
  protected beats: Beat[] = [];
  protected captions!: CaptionTrack;
  protected cam = new THREE.PerspectiveCamera(FOV, W / H, 10, 6000);
  private offs: { x: number; y: number }[] = [];

  /** Start of `word` (nth occurrence) in the narration line containing `line`. */
  protected at(line: string, word: string, nth = 0, lineNth = 0): number {
    const w = this.ctx.words;
    return w.word(w.find(line, lineNth), word, nth).start;
  }

  /** Builds the background and the caption track; call first in init(). */
  protected base(keys: string[]) {
    const kb = depthK(Z.BG);
    this.bg = new PaperBg(W * 1.5 * kb, H * 1.5 * kb, 1 / kb);
    this.bg.mesh.position.z = Z.BG;
    this.world.add(this.bg.mesh);
    const e = this.ctx.entry;
    this.captions = new CaptionTrack(captionsIn(e.start, e.end, keys));
    this.overlay.add(this.captions.group);
  }

  protected addBeats(beats: Beat[]) {
    this.beats = beats.sort((a, b) => a.t0 - b.t0);
    let x = 0, y = 0;
    this.offs = this.beats.map((b, i) => {
      if (i > 0) { x += STEPS[(i - 1) % STEPS.length][0]; y += STEPS[(i - 1) % STEPS.length][1]; }
      const o = b.at ?? { x, y };
      b.group.position.set(o.x, o.y, 0);
      this.world.add(b.group);
      return o;
    });
    this.bg.sheets(this.offs, this.beats.map((b) => b.color));
  }

  /** Sound cues of this entry: every beat updated on the 30 fps frame grid over the time it is
   *  on the table (pops report their T while being updated), plus one whoosh per glide. */
  cues(): Cue[] {
    const e = this.ctx.entry, n = this.beats.length, list: Cue[] = [], seen = new Set<string>();
    this.beats.forEach((b, i) => {
      const a = i === 0 ? e.start : this.window(i)[0], z = i === n - 1 ? e.end : this.window(i + 1)[1];
      collectCues(e.id, this.offs[i].x, list, seen, () => {
        for (let f = Math.ceil(a * FPS); f / FPS <= z; f++) b.update(f / FPS);
      });
    });
    collectCues(e.id, 0, list, seen, () => {
      for (let i = 1; i < n; i++) {
        const [a, z] = this.window(i);
        cue('whoosh', a, { dur: z - a, gain: 0.8, id: `glide${i}` });
      }
    });
    return list.filter((c) => c.t >= e.start - 0.5 && c.t < e.end);
  }

  /** Glide window into beat i (i ≥ 1), clamped so short beats never overlap two glides. */
  private window(i: number): [number, number] {
    const b = this.beats, t0 = b[i].t0;
    const prev = t0 - b[i - 1].t0, next = (b[i + 1]?.t0 ?? Infinity) - t0;
    return [t0 - Math.min(LEAD, prev * 0.3), t0 + Math.min(LAND, next * 0.3)];
  }

  /** Camera for beat i at t: its own rig keys, moved to where the beat sits on the table. */
  private camOf(i: number, t: number, extra: CamExtra): CamVals {
    const v = this.beats[i].rig.values(t, extra), o = this.offs[i];
    return { ...v, x: v.x + o.x, y: v.y + o.y };
  }

  render(f: Frame, target: THREE.WebGLRenderTarget | null) {
    const t = f.t, n = this.beats.length;
    // a beat is on the table from the start of the glide into it to the end of the glide out
    const win = this.beats.map((_, i) => (i === 0 ? [-Infinity, -Infinity] : this.window(i)));
    const extras: CamExtra[] = [];
    this.beats.forEach((b, i) => {
      const from = i === 0 ? -Infinity : win[i][0], to = i === n - 1 ? Infinity : win[i + 1][1];
      b.group.visible = t >= from && t <= to;
      extras[i] = b.group.visible ? b.update(t) : {};
    });
    let bi = 0;
    for (let i = 0; i < n; i++) if (t >= this.beats[i].t0) bi = i;
    // gliding between beats j-1 → j?
    let j = 0;
    for (let i = 1; i < n; i++) if (t > win[i][0] && t < win[i][1]) j = i;
    let v: CamVals;
    if (j > 0) {
      const u = glide(prog(t, win[j][0], win[j][1]));
      const a = this.camOf(j - 1, t, extras[j - 1]), b = this.camOf(j, t, extras[j]);
      const arc = Math.sin(Math.PI * u);
      v = {
        x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u),
        push: lerp(a.push, b.push, u) - LIFT * arc,
        roll: lerp(a.roll, b.roll, u) + BANK * arc * Math.sign(b.x - a.x || 1),
      };
    } else v = this.camOf(bi, t, extras[bi]);
    applyCam(this.cam, v);
    this.bg.follow(v.x, v.y);
    this.bg.seed = 0.5;
    this.captions.update(t);

    const r = this.ctx.renderer;
    r.setRenderTarget(target);
    r.autoClear = true;
    r.render(this.world, this.cam);
    r.autoClear = false;
    r.render(this.overlay, this.ocam);
    r.autoClear = true;
  }
}
