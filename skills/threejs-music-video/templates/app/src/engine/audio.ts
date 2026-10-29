// Song-time lookups over data/audio.json. All queries are pure functions of t.
import raw from '../../../data/audio.json';

export interface Section { name: string; start: number; end: number }

interface AudioJson {
  duration: number; bpm: number; beat_period: number; time_signature: number;
  beats: number[]; downbeats: number[]; sections: Section[]; fps: number;
  env: Record<string, number[]>; onsets: Record<string, [number, number][]>;
}

export type EnvName = 'rms' | 'low' | 'mid' | 'high' | 'vocal' | 'drums' | 'bass';
export type AudioSample = Record<EnvName, number>;

/** Index of the last element <= t (or -1). */
export function bisect(xs: ArrayLike<number>, t: number): number {
  let lo = 0, hi = xs.length;
  while (lo < hi) {
    const m = (lo + hi) >> 1;
    if (xs[m] <= t) lo = m + 1; else hi = m;
  }
  return lo - 1;
}

export class AudioData {
  readonly d = raw as unknown as AudioJson;
  readonly duration = this.d.duration;
  readonly bpm = this.d.bpm;
  readonly beatPeriod = this.d.beat_period;
  readonly beats = this.d.beats;
  readonly downbeats = this.d.downbeats;
  readonly sections = this.d.sections;
  readonly beatsPerBar = this.d.time_signature ?? 4;

  /** Beat index (may be fractional via phase) — beat k spans [beats[k], beats[k+1]). */
  beat(t: number): { index: number; phase: number } {
    const b = this.beats;
    const i = bisect(b, t);
    if (i < 0) return { index: -1, phase: (t - (b[0] - this.beatPeriod)) / this.beatPeriod };
    const next = i + 1 < b.length ? b[i + 1] : b[i] + this.beatPeriod;
    return { index: i, phase: (t - b[i]) / (next - b[i]) };
  }

  /** Bar index (counted from the first downbeat) and 0..1 phase through the bar. */
  bar(t: number): { index: number; phase: number; beatInBar: number } {
    const d = this.downbeats;
    const i = bisect(d, t);
    const bp = this.beatPeriod * this.beatsPerBar;
    const start = i < 0 ? d[0] - bp * Math.ceil((d[0] - t) / bp) : d[i];
    const end = i >= 0 && i + 1 < d.length ? d[i + 1] : start + bp;
    const phase = (t - start) / (end - start);
    return { index: i, phase, beatInBar: Math.floor(phase * this.beatsPerBar) };
  }

  section(t: number): Section {
    const i = Math.max(0, bisect(this.sections.map((s) => s.start), t));
    return this.sections[i];
  }

  sectionByName(name: string): Section {
    const s = this.sections.find((x) => x.name === name);
    if (!s) throw new Error(`no section ${name}`);
    return s;
  }

  /** Downbeat at or before t (snap for cuts). */
  downbeatAtOrBefore(t: number): number {
    const i = bisect(this.downbeats, t + 1e-6);
    return i < 0 ? 0 : this.downbeats[i];
  }

  /** First downbeat strictly after t. */
  downbeatAfter(t: number): number {
    const i = bisect(this.downbeats, t);
    return this.downbeats[Math.min(this.downbeats.length - 1, i + 1)];
  }

  /** Time of the most recent downbeat at/before t (-Infinity before the first). */
  lastDownbeat(t: number): number {
    const i = bisect(this.downbeats, t);
    return i < 0 ? -Infinity : this.downbeats[i];
  }

  nearestDownbeat(t: number): number {
    const i = bisect(this.downbeats, t);
    const a = this.downbeats[Math.max(0, i)], b = this.downbeats[Math.min(this.downbeats.length - 1, i + 1)];
    return Math.abs(t - a) <= Math.abs(b - t) ? a : b;
  }

  /** Linearly interpolated envelope value (~0..1). */
  env(name: EnvName, t: number): number {
    const e = this.d.env[name];
    const x = t * this.d.fps;
    const i = Math.floor(x);
    if (i < 0) return e[0];
    if (i >= e.length - 1) return e[e.length - 1];
    return e[i] + (e[i + 1] - e[i]) * (x - i);
  }

  sample(t: number): AudioSample {
    const names: EnvName[] = ['rms', 'low', 'mid', 'high', 'vocal', 'drums', 'bass'];
    return Object.fromEntries(names.map((n) => [n, this.env(n, t)])) as AudioSample;
  }

  /** Onsets of a kind in [a,b]. */
  onsets(kind: 'kick' | 'snare' | 'vocal', a: number, b: number): [number, number][] {
    return this.d.onsets[kind].filter(([t]) => t >= a && t <= b);
  }
}
