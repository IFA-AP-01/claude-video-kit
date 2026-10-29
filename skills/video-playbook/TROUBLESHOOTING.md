# Handling defects and remarks

Film-specific defect catalogues live in each skill (`app-motion-film`, `threejs-music-video`, `paper-vox-short`). This page is the method.

## 1. Find the cause before touching anything
- Name the mechanism: which layer, which parameter, since which change. A remark like "distorted", "washed out", "stutters", "scratched" or "jerky" is a symptom with one cause.
- Isolate by layer. The first layer where the defect appears is the cause:
  1. source capture
  2. cleaned or baked track
  3. 2D surface / canvas
  4. live playback
  5. render path
  6. encode
- Ask what changed since the last approved version. Most defects were regressions from my own previous fix:
  - a tele lens made the device look distorted
  - a big blur radius caused a white wash
- Check whether the user is looking at the right file. Example: the silent export instead of `_sfx`.

## 2. One remark = one change
- Change only the parameter behind the named defect. Keep everything else byte-for-byte.
- Show before/after stills at the same timestamps: open, landing, close, clip joints. Any difference outside the named spot is a regression; undo it.
- Never "fix" by swapping in a new model, a new effect, a new style or a whole rebuild.

## 3. Adjust by degree, never jump to the opposite extreme
Swinging too far was the main failure on 2026-10-29: frost .2 → 0, radius 72 → 28, blur gradient ↔ whole screen, sway on → all motion removed, "ugly" → element deleted.
| Remark | What to do |
|---|---|
| "Too strong / too much" | Reduce one step (about 30–50 %) and show it. Don't go to zero. |
| "Not visible / missing" | Restore the last approved level, then nudge. |
| "Wrong kind" (e.g. blur in the wrong place) | Fix where it applies; keep how strong it is. |
| Two remarks pulling in opposite directions | The answer is in between. Find it by comparing with the reference, not by flipping. |

## 4. Verify on what the user sees
- Compare side by side with the reference (real-device photo, approved render) at the same moment. "It changed as I intended" is not "fixed".
- Browser panes cache JS and CSS. Bust the cache and confirm that the loaded file contains the change before saying "fixed".
- Check many frames:
  - contact sheets
  - a full-res crop of the problem area
  - every joint and scene change
  One still is not proof.
- Check smoothness:
  - with a playback measurement (≥50 fps, 1.00×), not in a throttled preview pane
  - with ffprobe for CFR 60 on the output
- Check sound:
  - the preview plays the real mix
  - its length equals the film
  - every cue is audible
  - the delivered `_sfx` file has an audio stream
- Report exactly what was checked and what wasn't.

## 5. After the fix
- Add the root cause → rule to the right skill (or `LESSONS.md`) the same day.
- Log the remark and its result in `REQUESTS.md`.
