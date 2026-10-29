// Caption phrases from data/captions.json (made by analysis/captions.py from the alignment):
// [{ text, start, end, line, section }]. Scenes take the phrases inside their entry and pick the
// marker words themselves.
import type { CaptionItem } from './caption';

export interface CaptionRow { text: string; start: number; end: number; line: number; section: string }

const files = import.meta.glob<CaptionRow[]>('../../../data/captions.json', { eager: true, import: 'default' });
const rows: CaptionRow[] = Object.values(files)[0] ?? [];

/** Phrases starting in [start, end). Each gets the first of `keys` found in its text as marker. */
export function captionsIn(start: number, end: number, keys: string[] = []): CaptionItem[] {
  return rows
    .filter((r) => r.start >= start && r.start < end)
    .map((r) => {
      const key = keys.find((k) => r.text.includes(k));
      return { text: r.text, start: r.start, end: Math.min(r.end, end), ...(key ? { key } : {}) };
    });
}
