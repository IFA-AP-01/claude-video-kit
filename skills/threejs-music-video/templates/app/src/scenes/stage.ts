// Example 3D scene: a field of seeded blocks that breathes with the bass and punches on every
// downbeat, a camera that moves through keyframed poses timed to lyric words, and the sung line
// popping in word by word on a canvas plane that rides with the camera.
// Closed-form in t (no state): every value below is computed from `f` alone.
import * as THREE from 'three';
import { arrive, LyricBlock } from '../engine/lyric';
import { cubicInOut, lerp, prog } from '../engine/ease';
import type { Line } from '../engine/lyrics';
import { C, CFONT } from '../engine/palette';
import { hash, mulberry32 } from '../engine/rand';
import { H, Scene, W, type Frame } from '../engine/scene';

const N = 400;
const LYR = { w: 1600, h: 360, size: 96 };

interface Pose { x: number; y: number; z: number; tx: number; ty: number; fov: number }
const mix = (a: Pose, b: Pose, s: number): Pose => ({
  x: lerp(a.x, b.x, s), y: lerp(a.y, b.y, s), z: lerp(a.z, b.z, s),
  tx: lerp(a.tx, b.tx, s), ty: lerp(a.ty, b.ty, s), fov: lerp(a.fov, b.fov, s),
});

export default class Stage extends Scene {
  private scene = new THREE.Scene();
  private cam = new THREE.PerspectiveCamera(40, W / H, 1, 5000);
  private blocks!: THREE.InstancedMesh;
  private base: { x: number; z: number; h: number; ph: number }[] = [];
  private m = new THREE.Matrix4();
  private lyr!: { canvas: HTMLCanvasElement; g: CanvasRenderingContext2D; tex: THREE.CanvasTexture; mesh: THREE.Mesh };
  private blocksByLine = new Map<Line, LyricBlock>();
  private lines: Line[] = [];
  private T: Record<string, number> = {};

  async init() {
    const { entry, lyrics, audio } = this.ctx;
    this.scene.background = new THREE.Color(C.night);
    this.scene.fog = new THREE.Fog(C.night, 600, 2600);
    this.scene.add(new THREE.HemisphereLight('#ffffff', '#3a2f22', 1.2));
    const sun = new THREE.DirectionalLight('#ffffff', 2.2);
    sun.position.set(300, 800, 400);
    this.scene.add(sun, this.cam);

    // seeded layout: same blocks on every load, in preview and in export
    const rnd = mulberry32(1234);
    this.blocks = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: C.paper, roughness: 0.9 }), N);
    for (let i = 0; i < N; i++) {
      const r = 180 + 1400 * Math.sqrt(rnd()), a = rnd() * Math.PI * 2;
      this.base.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, h: 20 + 160 * rnd() ** 2, ph: rnd() });
      this.blocks.setColorAt(i, new THREE.Color(rnd() < 0.08 ? C.accent : C.paper));
    }
    this.scene.add(this.blocks);

    // lyric plane, parented to the camera so it stays framed
    const canvas = document.createElement('canvas');
    canvas.width = LYR.w; canvas.height = LYR.h;
    const g = canvas.getContext('2d')!;
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(LYR.w, LYR.h),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, fog: false }));
    const d = H / 2 / Math.tan(THREE.MathUtils.degToRad(40 / 2));   // 1 unit = 1 px at this distance
    mesh.position.set(0, -H * 0.28, -d);
    mesh.renderOrder = 10;
    this.cam.add(mesh);
    this.lyr = { canvas, g, tex, mesh };

    // layout of every line this entry can show, measured once (fonts are loaded before init)
    this.lines = lyrics.lines.filter((l) => l.end > entry.start && l.start < entry.end);
    for (const l of this.lines) {
      this.blocksByLine.set(l, new LyricBlock(l, { font: `800 ${LYR.size}px ${CFONT.display}`, size: LYR.size,
        maxWidth: LYR.w - 80 }, g));
    }

    // camera beats tied to words (fall back to section-relative times if the lines differ)
    const first = this.lines[0], last = this.lines[this.lines.length - 1];
    this.T = {
      open: entry.start,
      rise: first ? audio.downbeatAtOrBefore(first.start) : entry.start,
      swing: last ? audio.downbeatAtOrBefore(last.start) : (entry.start + entry.end) / 2,
      end: entry.end,
    };
  }

  private pose(t: number): Pose {
    const T = this.T;
    let p: Pose = { x: 0, y: 900, z: 1400, tx: 0, ty: 0, fov: 40 };
    const go = (q: Pose, a: number, b: number) => { const s = cubicInOut(prog(t, a, b)); if (s > 0) p = mix(p, q, s); };
    go({ x: 0, y: 260, z: 900, tx: 0, ty: 120, fov: 40 }, T.open, T.rise + 0.5);
    go({ x: 700, y: 180, z: 600, tx: 0, ty: 160, fov: 34 }, T.swing - 1, T.swing + 1.5);
    return p;
  }

  render(f: Frame, target: THREE.WebGLRenderTarget | null) {
    const t = f.t;
    const punch = Math.exp(-6 * f.barPhase);            // decays over the bar from each downbeat
    const bass = f.a.low;

    for (let i = 0; i < N; i++) {
      const b = this.base[i];
      const wave = 0.5 + 0.5 * Math.sin(t * 2 + b.ph * 6.28);
      const h = b.h * (0.6 + 0.6 * bass * wave + 0.5 * punch * (hash(i, f.bar) > 0.7 ? 1 : 0));
      this.m.makeScale(28, h, 28).setPosition(b.x, h / 2, b.z);
      this.blocks.setMatrixAt(i, this.m);
    }
    this.blocks.instanceMatrix.needsUpdate = true;

    const p = this.pose(t);
    this.cam.fov = p.fov;
    this.cam.updateProjectionMatrix();
    this.cam.position.set(p.x, p.y + 6 * punch, p.z);
    this.cam.lookAt(p.tx, p.ty, 0);

    // lyric: the active line (or the one about to start), words pop on their own start times
    const { g, canvas, tex } = this.lyr;
    g.clearRect(0, 0, canvas.width, canvas.height);
    const line = this.lines.find((l) => t >= l.start - 0.2 && t <= l.end + 0.4);
    if (line) {
      const blk = this.blocksByLine.get(line)!;
      const out = 1 - arrive(t, line.end + 0.2, 0.2);
      g.globalAlpha = out;
      blk.draw(g, t, canvas.width / 2, (canvas.height - blk.height) / 2, C.paper, 'center');
      g.globalAlpha = 1;
    }
    tex.needsUpdate = true;

    const r = this.ctx.renderer;
    r.setRenderTarget(target);
    r.render(this.scene, this.cam);
  }
}
