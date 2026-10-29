// Which scene plays when. Cut points come from the lyrics / sections, never hard-coded
// seconds: re-running the alignment moves every cut with it.
import type { AudioData } from './engine/audio';
import type { Lyrics } from './engine/lyrics';
import type { SceneClass, TimelineEntry } from './engine/scene';

const modules = import.meta.glob<{ default: SceneClass }>('./scenes/*.ts');

/** Scene module loaders keyed by file name; `<id>-*.ts` helper files are not scenes. */
export const sceneLoaders: Record<string, () => Promise<{ default: SceneClass }>> = Object.fromEntries(
  Object.entries(modules)
    .map(([path, load]) => [path.replace('./scenes/', '').replace(/\.ts$/, ''), load] as const)
    .filter(([name]) => !name.includes('-')),
);

export function makeTimeline(audio: AudioData, lyrics: Lyrics): TimelineEntry[] {
  //   sec('chorus1')          -> section bounds (already downbeat-snapped by analyze.py)
  //   cut('Code it, ship it') -> downbeat at/before that line's first word
  const sec = (name: string) => audio.sectionByName(name);
  const cut = (needle: string, nth = 0) => audio.downbeatAtOrBefore(lyrics.find(needle, nth).start);
  void cut;

  // Phase 1: every section is the `_sync` debug scene (check the alignment first).
  // Then replace sections one or two at a time with real scenes, e.g.
  //   if (s.name === 'chorus1') {
  //     const into = cut('Make a video');                     // mid-section cut, on a downbeat
  //     entries.push({ id: 'ship', scene: 'ship', start, end: into, params });
  //     entries.push({ id: 'phone', scene: 'phone', start: into, end, params, fadeIn: 0.25 });
  //   }
  // The template's two example scenes alternate over the choruses: 'stage' (instanced blocks,
  // camera keyframes) and 'studio' (clay set through engine/look.ts).
  const entries: TimelineEntry[] = [];
  let chorus = 0;
  for (const s of audio.sections) {
    const { start, end } = sec(s.name);
    const params = { section: s.name };
    if (s.name.startsWith('chorus')) {
      entries.push({ id: s.name, scene: chorus++ % 2 ? 'studio' : 'stage', start, end, params });
    } else {
      entries.push({ id: s.name, scene: '_sync', start, end, params });
    }
  }
  return entries;
}

/** `?portrait`: the vertical cut — one entry over a loopable range (downbeat to downbeat). */
export function makePortraitTimeline(audio: AudioData, _lyrics: Lyrics): TimelineEntry[] {
  const s = audio.sections.find((x) => x.name.startsWith('chorus')) ?? audio.sections[0];
  return [{ id: 'portrait', scene: 'stage', start: s.start, end: s.end, params: { section: s.name } }];
}
