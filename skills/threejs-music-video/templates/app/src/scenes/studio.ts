// Example "clay set" scene: plasticine blobs on a clay floor hop on the beat (each blob owns a
// hashed subset of beats, squash on landing), soft VSM shadows, GTAO creases, Neutral tone, and
// the sung line drawn #FFFFFF on a full-frame canvas that Look recolours to ink or paper against
// whatever is behind each word. Closed-form in t: no state, every value comes from `f`.
import * as THREE from 'three';
import { clay } from '../engine/clay';
import { cubicInOut, lerp, prog } from '../engine/ease';
import { Look } from '../engine/look';
import { arrive, LyricBlock } from '../engine/lyric';
import type { Line } from '../engine/lyrics';
import { C, CFONT } from '../engine/palette';
import { hash, mulberry32 } from '../engine/rand';
import { CanvasSurface } from '../engine/shapes';
import { H, PORTRAIT, Scene, W, type Frame } from '../engine/scene';

const N = 9;
const LYR_SIZE = PORTRAIT ? 92 : 104;
const HUES = [C.accent, '#F2B33D', '#4F8FE0', '#7CC47A', C.paper];

interface Blob { mesh: THREE.Mesh; x: number; z: number; r: number; seed: number }

export default class Studio extends Scene {
  private scene = new THREE.Scene();
  private cam = new THREE.PerspectiveCamera(PORTRAIT ? 50 : 32, W / H, 10, 4000);
  private look!: Look;
  private blobs: Blob[] = [];
  private surf!: CanvasSurface;
  private blocks = new Map<Line, LyricBlock>();
  private lines: Line[] = [];

  async init() {
    const { entry, lyrics, renderer } = this.ctx;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.VSMShadowMap;

    this.scene.background = new THREE.Color('#BFD8E8');
    this.scene.add(new THREE.HemisphereLight('#ffffff', '#8A7A66', 1.4));
    const sun = new THREE.DirectionalLight('#fff3e0', 2.4);
    sun.position.set(-300, 600, 350);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.radius = 8;
    sun.shadow.blurSamples = 16;
    sun.shadow.bias = -0.0005;
    Object.assign(sun.shadow.camera, { left: -500, right: 500, top: 500, bottom: -500, near: 10, far: 1800 });
    this.scene.add(sun);

    // floor: world-space noise (big static prop), soft tint patches; bump × freq ≈ 0.08
    const floor = new THREE.Mesh(new THREE.CircleGeometry(1600, 96),
      clay('#E9D9BF', { world: true, freq: 0.05, bump: 1.6, tint: '#DCC6A3', patch: 0.6, patchFreq: 0.004 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // blobs: seeded ring layout, object-space noise so the texture rides with the squash
    const rnd = mulberry32(77);
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2 + rnd() * 0.3, d = 140 + 120 * rnd();
      const r = 26 + 22 * rnd();
      const geo = i % 3 === 0 ? new THREE.CapsuleGeometry(r * 0.7, r, 8, 24) : new THREE.SphereGeometry(r, 48, 32);
      const mesh = new THREE.Mesh(geo, clay(HUES[i % HUES.length], { freq: 0.12, bump: 0.6, sheen: 0.18 }));
      mesh.castShadow = mesh.receiveShadow = true;
      this.scene.add(mesh);
      this.blobs.push({ mesh, x: Math.cos(a) * d, z: Math.sin(a) * d, r, seed: i });
    }

    this.look = new Look(renderer, this.scene, this.cam);

    // lyrics: one full-frame canvas, words drawn pure white -> auto ink/paper in Look.composite
    this.surf = new CanvasSurface(W, H, 1, false);
    this.lines = lyrics.lines.filter((l) => l.end > entry.start && l.start < entry.end);
    for (const l of this.lines) {
      this.blocks.set(l, new LyricBlock(l, { font: `800 ${LYR_SIZE}px ${CFONT.display}`, size: LYR_SIZE,
        maxWidth: PORTRAIT ? 860 : 1500 }, this.surf.ctx));
    }
  }

  /** Height and squash of blob b at beat index/phase: it hops on its own hashed beats. */
  private hop(b: Blob, beat: number, phase: number): { y: number; sq: number } {
    const on = (k: number) => hash(b.seed, k) > 0.55;
    const y = on(beat) ? 4 * phase * (1 - phase) * b.r * 2.2 : 0;
    const land = on(beat - 1) ? Math.exp(-10 * phase) : 0;     // squash right after a landing
    return { y, sq: 1 - 0.28 * land + 0.12 * (y / (b.r * 2.2)) };
  }

  render(f: Frame, target: THREE.WebGLRenderTarget | null) {
    const t = f.t, { start, end } = this.ctx.entry;

    for (const b of this.blobs) {
      const { y, sq } = this.hop(b, f.beat, f.beatPhase);
      b.mesh.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
      const half = b.mesh.geometry instanceof THREE.CapsuleGeometry ? b.r * 1.2 : b.r;
      b.mesh.position.set(b.x, half * sq + y, b.z);
      b.mesh.rotation.y = 0.4 * Math.sin(t * 0.7 + b.seed);
    }

    // slow orbit plus a push-in over the entry
    const s = cubicInOut(prog(t, start, end));
    const a = 0.35 + 0.5 * s, dist = lerp(PORTRAIT ? 900 : 760, PORTRAIT ? 700 : 560, s);
    this.cam.position.set(Math.sin(a) * dist, lerp(360, 240, s), Math.cos(a) * dist);
    this.cam.lookAt(0, 40, 0);

    // lyric canvas
    const g = this.surf.begin();
    const line = this.lines.find((l) => t >= l.start - 0.2 && t <= l.end + 0.4);
    if (line) {
      const blk = this.blocks.get(line)!;
      g.globalAlpha = 1 - arrive(t, line.end + 0.2, 0.2);
      blk.draw(g, t, W / 2, H * (PORTRAIT ? 0.62 : 0.7) - blk.height / 2, '#FFFFFF', 'center');
    }
    this.surf.commit();

    const r = this.ctx.renderer;
    r.setRenderTarget(this.look.rt);
    r.render(this.scene, this.cam);
    this.look.ao(this.cam, 40, 30);
    this.look.composite(target, { lyric: line ? this.surf.tex : null, blur: 60 });
  }

  dispose() { this.look.dispose(); }
}
