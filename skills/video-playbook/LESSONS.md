# Lessons from past video and store-asset work (root cause → rule)

Each entry says what went wrong, the root cause, and the rule now in force. Add new entries the day they happen.

## Process failures (every project)
| What happened | Root cause | Rule |
|---|---|---|
| Many "done" reports that were wrong (MetaCam, 2026-10-27) | Reported without re-checking each requested item; stale build on the simulator | Checklist every item, check each against the user's original request, confirm the installed binary is fresher than the edits |
| Parameters swung end to end, and each swing caused the next remark (Duo film, 2026-10-29) | Treated "too strong" as "remove" and "missing" as "max" | Adjust by degree (`TROUBLESHOOTING.md` §3) |
| A remark calling an element ugly led to it being deleted | Read a quality remark as a removal request | Ugly = improve; never delete a background or element unasked |
| A video explainer took 4 hours with constant steering (Vox short) | Review after every scene, late tempo change, two sessions | One brief, two checkpoints, one session |
| A worktree and branch were created unasked, and a commit was proposed before verification (MetaCam) | Default tooling habits | Commit only when asked, on the main branch, after reported checks; clean up any worktree |
| Asked for approval again on items already requested | Over-cautious gating | The request is the approval; gate only the table in `WORKING-STYLE.md` |
| Deletion confirmation dragged on | Confirmation split over several turns | List the exact paths once, delete on the first yes |
| Test clips rendered without being asked | Habit of "proving" with renders | Verify with stills and contact sheets; render on request |
| Simulator deleted without an exact confirmed list | Guessed which device an ambiguous name meant | Never delete sims or data without a confirmed name plus UDID/path list |
| Mac mini rebooted during audio separation | MPS GPU hang under a heavy model | CPU, `nice`, chunks, one heavy job at a time |
| User opened the silent export and heard no sound | Two files with similar names | Say which file has sound; name it `_sfx`; check the audio stream before reporting |

## Store screenshots and boards (MetaCam iOS, MetaCam Android, IPTV player)
- Fake hands, UI or status bars were rejected. Capture real screens.
- Crossfaded stills read as cheap. Use real screen recordings.
- Flat backgrounds looked dead. Add texture (grain/paper) and a soft glow.
- Too many text specs on the header. Keep it minimal, close to Apple's own calm look.
- The phone was crowded by zoom ×2. Use ×1.6.
- The same component appeared zoomed twice ("ghost" copies). One component, one appearance.
- The user's icon was redesigned. Never redesign it; only sharpen or recolour.
- A blue→purple aurora gradient was rejected as generic. Use the brand palette.
- A full set was produced before the style was approved. Show 1–2 samples first.
- A new design started from scratch replaced the user's set. Start from their existing set and upgrade incrementally.
- Generic stock photos and busy B&W street shots were rejected. Use artistic photos and a shortlist contact sheet. Credit the exact photographer.
- Cutout/knockout and thin basic templates looked weak. Show new, iconic templates (e.g. Masthead).
- The landing page repeated the camera view on every screenshot. Show varied features. Inter was replaced by Instrument Sans, faded text was made solid, and images were converted to WebP.

## Motion films from real app screens (MetaCam Duo film)
- Dup-then-jump stutter inside the phone: `simctl` VFR capture. Fix with cfr → fixdup → audit.
- Uneven motion: non-integer playback rates and hard clip switches. Fix with baked tracks at rate 1 and dissolves under motion.
- Off-by-one seek: float rounding. Seek `floor(t*60+1e-4)/60 + .5/60`.
- Preview flicker: frame counting and drawing while seeking. Use wall-clock time, skip `seeking` videos, rVFC + `createImageBitmap`.
- Hatching ("scratched disc") on the screen near the hinge: z-fighting from wide near/far. Keep near/far tight; check depth precision ≈ z²/(near·2²⁴).
- Device looked distorted: a tele lens flattened it. Keep the 24° lens.
- White wash on the fold: blur radius too big plus frost. Apply blur only on the moving leaf, `edge^2.2`, R = 28 px per 2670 px, no frost.
- No sound in the preview: the bed was built for an older length. Rebuild the bed to the film length and re-mix after cue changes.
- Aimless sine sway was rejected. Every move needs a purpose.
- Stutter at specific seconds (2–3 s, 6–8 s) in a header video: a frozen layer and a seek mismatch. Use time-driven layers and check every joint.

## Music videos (three.js, idontknow project)
- The raw Unity-like look was rejected. Add a texture/toon layer; use contrast instead of text shadows.
- Style swung between scenes. Keep one material and one font (Bricolage Grotesque) across the film.
- Objects overlapped and characters looked blocky. Plan the layout per shot; soft, rounded 3D characters.
- Lyrics floated flat. Put 3D text in space, timed to word-level alignment (`lyric-beat-analysis`).
- Cuts felt choppy. Use one-shot camera transitions with motion blur (`camera-motion`).
- Commit per finished scene. Deliver 1080p60 or 4K plus a thumbnail.

## Explainer shorts (paper Vox style)
- Voice sounded amateur. Clean studio voice first (CPU enhance), splice the glitches.
- The camera jittered. Use more one-shot pans and less shake.
- SFX were too quiet. Mix SFX before continuing to the next scenes, and check the levels.
- The user wanted a lighter render. Use a smaller file and the `--soft` render mode.
- Leftover node_modules and media. Clean up after delivery (list first).

## Brand promos (Saveo)
- The background was too light for the brand. Match the brand's darker tone.
- Voice glitches were fixed by splicing retakes. Keep the music bed low under the voice.

## Kinetic 3D text (Scenario kinetic film)
- Text tilt and borders were too strong. Reduce them; use cuter, softer materials.
- Paid music/SFX generation: always quote credits first.
