// Which scene plays when. One timeline entry per script section ([tag] in script.txt → `section`
// of each line in data/words.json), cut in the pause before the section's first line, never at
// hard-coded seconds: re-running the alignment moves every cut with it.
// A section plays `scenes/<section>.ts` once that file exists, else the generic `example` scene,
// so the whole video previews (captions, pops, camera, SFX) before any real scene is written.
import type { Words } from './engine/words';
import type { SceneClass, TimelineEntry } from './engine/scene';

const modules = import.meta.glob<{ default: SceneClass }>('./scenes/*.ts');

/** Scene module loaders keyed by file name; `<id>-*.ts` helper files are not scenes. */
export const sceneLoaders: Record<string, () => Promise<{ default: SceneClass }>> = Object.fromEntries(
  Object.entries(modules)
    .map(([path, load]) => [path.replace('./scenes/', '').replace(/\.ts$/, ''), load] as const)
    .filter(([name]) => !name.includes('-')),
);

/** Cut at a narration line: midway through the pause before its first word. */
export function cutAt(words: Words, needle: string, nth = 0): number {
  const l = words.find(needle, nth);
  const prev = words.lines[words.lines.indexOf(l) - 1];
  return prev ? (prev.end + l.start) / 2 : 0;
}

/** Sections in narration order with the cut before each one's first line. */
export function sections(words: Words): { id: string; start: number }[] {
  const out: { id: string; start: number }[] = [];
  words.lines.forEach((l, i) => {
    if (out.length && out[out.length - 1].id === l.section) return;
    const prev = words.lines[i - 1];
    out.push({ id: l.section, start: prev ? (prev.end + l.start) / 2 : 0 });
  });
  return out;
}

export function makeTimeline(words: Words): TimelineEntry[] {
  const secs = sections(words);
  if (!secs.length) return [{ id: 'example', scene: 'example', start: 0, end: words.duration }];
  return secs.map((s, i) => ({
    id: s.id,
    scene: sceneLoaders[s.id] ? s.id : 'example',
    start: s.start,
    end: secs[i + 1]?.start ?? words.duration,
  }));
}
