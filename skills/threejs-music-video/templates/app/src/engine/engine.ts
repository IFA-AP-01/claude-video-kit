import * as THREE from 'three';
import { AudioData, bisect } from './audio';
import { Lyrics } from './lyrics';
import { preloadFonts } from './text';
import { H, PORTRAIT, W, type Frame, type Scene, type TimelineEntry } from './scene';
import { makePortraitTimeline, makeTimeline, sceneLoaders } from '../timeline';
import { Post } from './post';

export interface EngineOpts {
  exportMode?: boolean;
  scale?: number; // render resolution multiplier (1 = W×H)
}

export class Engine {
  readonly renderer: THREE.WebGLRenderer;
  readonly audio = new AudioData();
  readonly lyrics = new Lyrics();
  readonly timeline: TimelineEntry[];
  private loading = new Map<string, Promise<Scene>>();
  private ready = new Map<string, Scene>();
  readonly post: Post;
  private fontsReady: Promise<void>;

  constructor(canvas: HTMLCanvasElement, readonly opts: EngineOpts = {}) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false, // scenes render into MSAA targets; the canvas only gets the post pass
      alpha: false,
      // export reads pixels back after rendering
      preserveDrawingBuffer: !!opts.exportMode,
      powerPreference: 'high-performance',
    });
    const s = opts.scale ?? 1;
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(W * s, H * s, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.localClippingEnabled = true;
    this.timeline = PORTRAIT ? makePortraitTimeline(this.audio, this.lyrics) : makeTimeline(this.audio, this.lyrics);
    this.post = new Post(this.renderer, s);
    this.fontsReady = preloadFonts();
  }

  get duration() { return this.audio.duration; }

  entryAt(t: number): TimelineEntry {
    const tl = this.timeline;
    const i = bisect(tl.map((e) => e.start), t);
    return tl[Math.max(0, Math.min(tl.length - 1, i))];
  }

  entryIndex(e: TimelineEntry) { return this.timeline.indexOf(e); }

  /** Create + init the scene for an entry (once). */
  scene(e: TimelineEntry): Promise<Scene> {
    let p = this.loading.get(e.id);
    if (!p) {
      p = (async () => {
        await this.fontsReady;
        const load = sceneLoaders[e.scene];
        if (!load) throw new Error(`unknown scene module "${e.scene}" for entry ${e.id}`);
        const Cls = (await load()).default;
        const sc = new Cls({ renderer: this.renderer, audio: this.audio, lyrics: this.lyrics,
                             entry: e, params: e.params ?? {} });
        await sc.init();
        this.ready.set(e.id, sc);
        return sc;
      })();
      this.loading.set(e.id, p);
    }
    return p;
  }

  async prepareAll() {
    await Promise.all(this.timeline.map((e) => this.scene(e)));
  }

  frame(t: number, dt: number, e: TimelineEntry): Frame {
    const a = this.audio;
    const beat = a.beat(t);
    const bar = a.bar(t);
    const w = this.lyrics.wordAt(t);
    return {
      t, dt,
      lt: t - e.start,
      p: (t - e.start) / (e.end - e.start),
      start: e.start, end: e.end,
      beat: beat.index, beatPhase: beat.phase,
      bar: bar.index, barPhase: bar.phase, beatInBar: bar.beatInBar,
      section: a.section(t),
      a: a.sample(t),
      line: this.lyrics.activeLine(t),
      word: w?.word ?? null,
      wordIndex: w?.index ?? -1,
    };
  }

  /** Previous entry + mix weight of `e` while e fades in, else null. */
  private fading(t: number, e: TimelineEntry): { prev: TimelineEntry; k: number } | null {
    const i = this.entryIndex(e);
    if (!e.fadeIn || i <= 0 || t >= e.start + e.fadeIn) return null;
    const k = (t - e.start) / e.fadeIn;
    return { prev: this.timeline[i - 1], k: k * k * (3 - 2 * k) };
  }

  /** Scene(s) -> rtA, post pass -> canvas. */
  private compose(t: number, dt: number, e: TimelineEntry, sc: Scene, prev: { e: TimelineEntry; sc: Scene; k: number } | null) {
    const post = this.post;
    if (prev) {
      prev.sc.render(this.frame(t, dt, prev.e), post.rtA);
      sc.render(this.frame(t, dt, e), post.rtB);
      post.blendB(prev.k);
    } else {
      sc.render(this.frame(t, dt, e), post.rtA);
    }
    const po = sc.postOpts(t) ?? {};
    post.finish(Math.round(t * 60), {
      grain: po.grain ?? (e.params?.grain as number | undefined),
      vignette: po.vignette ?? (e.params?.vignette as number | undefined),
    });
  }

  /** Render t if its scene(s) are ready; otherwise start loading and return false. */
  renderIfReady(t: number, dt = 1 / 60): boolean {
    const e = this.entryAt(t);
    const sc = this.ready.get(e.id);
    const fd = this.fading(t, e);
    const psc = fd ? this.ready.get(fd.prev.id) : undefined;
    if (!sc || (fd && !psc)) { void this.scene(e); if (fd) void this.scene(fd.prev); return false; }
    this.compose(t, dt, e, sc, fd && psc ? { e: fd.prev, sc: psc, k: fd.k } : null);
    return true;
  }

  /** Render t, waiting for the scene(s) if needed (export / stills). */
  async render(t: number, dt = 1 / 60): Promise<TimelineEntry> {
    const e = this.entryAt(t);
    const sc = await this.scene(e);
    const fd = this.fading(t, e);
    const prev = fd ? { e: fd.prev, sc: await this.scene(fd.prev), k: fd.k } : null;
    this.compose(t, dt, e, sc, prev);
    return e;
  }
}
