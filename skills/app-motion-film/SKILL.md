---
name: app-motion-film
description: Use for any app store / social motion film for any app built from real simulator screen recordings, such as a Duo motion film, a promo video, a feature film for a release, or "turn these screens into a video". It records the iOS Simulator (iPhone Duo folded/open), cleans the recordings into 60 fps tracks, drops them into the kinetic-film engine with the 3D iPhone Duo block, previews in HTML, checks playback and renders 4K 60 fps with and without sound. Start here instead of rebuilding the pipeline.
---

# App motion film (real screens in a 3D Duo, kinetic type, 60 fps)

The engine is `scenario-kinetic-film` (render/finish/mix/snap). This skill adds what app films need on top of it: recording the simulator, turning the recordings into clean 60 fps tracks, the `Duo` 3D device block, and the checks that caught every past defect. The reference film is `template/` (`spec.js` + `duo.js`, an iPhone Duo release film; its copy and brand are an example). New films start as a copy of it.

Read the `video-playbook` skill first (`WORKING-STYLE.md`, `AESTHETICS.md`, `TROUBLESHOOTING.md`, `PIPELINE.md`), then the project's own `PLAYBOOK.md` for UDIDs, display IDs, flags and paths.

## What to ask the user (once, up front)
1. Which screens/features, in order, and the text line for each (or "draft it").
2. Length (default 30–40 s), size (default 1080² stage → 2160² render).
3. Music: wait for the user's track. Never render before the music arrives and the HTML preview is approved.

Everything else has a default; do not ask about it. Log each request in the project's `REQUESTS.md` first (template in `video-playbook/templates`).

## Pipeline (exact commands; `S=~/.claude/skills/app-motion-film/scripts`, `K=~/.claude/skills/scenario-kinetic-film`, `PY=$K/.venv/bin/python`, `<film>` = the film folder inside the project)

1. **New film:** `$S/new_film.sh <film>` (copies the template's engine, blocks, fonts, sfx; installs node_modules). Then add device art to `<film>/assets`: `duo_inner.png` / `duo_back.png` from Apple Design Resources bezels, and the app icon as `icon.png`.
2. **Record** (one simulator booted only; use the project's temporary unlock flag if it has one, remove it right after):
   - `$S/posture.sh Open|Closed` folds the Duo through DeviceHub (simctl cannot fold).
   - `export SIM_UDID=<udid> SIM_INNER=<display> SIM_OUTER=<display>` (from the project PLAYBOOK or `xcrun simctl io <udid> enumerate`), then `$S/rec.sh start /tmp/<name>/raw/<shot>.mov inner|outer`, drive the app, then `$S/rec.sh stop`.
   - Tap slowly with pauses: the cut points must fall inside still holds.
3. **CFR:** `$S/cfr.sh raw/<shot>.mov <shot>_cfr.mp4 [start] [end]` gives 60 fps CFR and prints frames/rate.
4. **Fill dropped frames:** `$PY $S/fixdup.py <shot>_cfr.mp4 <shot>_c.mp4` (optical-flow fill of duplicate runs inside motion; up to 3 passes).
5. **Bake one track per screen** (`$PY $S/bake.py inner.json`). Paths are relative to the json. Segments play back to back; `rate` is frame-blended, and `xf` dissolves from the previous segment:
   ```json
   {"w":2852,"h":2006,"dur":38,"out":"assets/cap/track_inner.mp4",
    "src":{"onb":"cap/onb_c.mp4","pin":"cap/pin_c.mp4","cam":"cap/cam_c.mp4"},
    "segs":[{"src":"onb","at":2.67,"from":0,"stop":7.53},
            {"src":"pin","at":9.85,"from":0,"rate":1.6,"stop":8.1,"xf":0.35},
            {"src":"cam","at":15.0,"from":0,"rate":1.2,"stop":9.1,"xf":0.5}]}
   ```
   - Inner = 2852×2006 landscape.
   - Outer = the outer screen size; a png still is allowed as a src.
6. **Audit:** `$PY $S/audit.py assets/cap/track_inner.mp4 assets/cap/track_outer.mp4`.
   - Exit 1 means a frozen frame inside motion: fix it before going on.
   - "Jumps to eyeball" are usually real taps; look at each one.
7. **Preview proxies:** `$S/proxy.sh assets/cap/track_inner.mp4 1424` (and the outer one). Point `preview:` in spec.js clips at them; `src:` stays the full track for render.
8. **Edit `spec.js`:** text lines (`Say`), Duo `keys`/`open`/`close` in beats (120 bpm → 1 beat = 0.5 s), clips, cues, card.
9. **Serve and show the preview:**
   - Run `python3 -m http.server 8765` from the repo root.
   - Open `http://127.0.0.1:8765/<film>/?t=0` in the Browser pane. Space plays; `?t=` jumps.
   - After editing js, the pane caches: `await fetch('duo.js',{cache:'reload'})` and the same for spec.js, then reload.
10. **Automated checks before showing the user:**
    - **Playback:** run `STAGE=1080x1080 FILM_URL=http://127.0.0.1:8765/<film>/ node $S/playcheck.mjs /tmp/<name>/play 0 37 36` from the film folder. It must give ≥50 fps, 1.00× and no errors. (The Browser pane is throttled to ~1 fps, so never judge playback there.)
    - **Look at the shots:**
      - Whole frames: `ffmpeg -pattern_type glob -i '/tmp/<name>/play/play_*.png' -vf "scale=400:-2,tile=6x6" sheet.png`.
      - Hinge strip at full res: `-vf "crop=240:700:420:250,tile=18x2"`.
    - **Render-path stills:** `STAGE=1080x1080 FILM_URL=... node $K/scripts/snap.mjs /tmp/<name>/stills 1 4.6 5.4 6.2 15 22 33.6 34.4` (seconds, or beats like `b12`). Take them at every open/close and every clip joint.
11. **Render** (only after preview OK + music):
    ```bash
    STAGE=1080x1080 $PY $K/scripts/render.py . --res <1080|4k> --out out/rN/video_<res>.mp4
    ```
    `--res 1080` = 1080², `--res 4k` = 2160² (`--workers 2` for 4k). Render into a fresh `out/rN/` so the previous deliverable stays until the new one passes. Then:
    - `$PY $K/scripts/mix.py . --out out/rN/mix.wav`
    - `$PY $K/scripts/finish.py . --video out/rN/video_<res>.mp4 --dest out/final --no-vertical --name <name>` (finish.py appends `_<res>p60` itself), plus a second run with `--audio out/rN/mix.wav` and the name `<name>_sfx`.
    - Old renders: list exact paths when the user asks to delete them, delete on the yes.
    - Copy the results to the project's delivery folder (named in its PLAYBOOK).
    - `ffprobe` must show `r_frame_rate=avg_frame_rate=60/1`.

## Defects already hit, with root cause → rule (do not rediscover them)
- **Dup-then-jump stutter inside the phone:** `simctl recordVideo` is VFR and drops frames in scrolls, so CFR turns the gaps into repeats. Rule: always run fixdup and then audit.
- **Uneven motion:** non-integer playback rates step 1 or 2 source frames, and hard clip switches pop. Rule: bake retimes with frame blending and dissolves, and the film plays tracks at rate 1.
- **Off-by-one frame on seek:** float `floor(t*60)` rounding. Rule: seek to `floor(t*60+1e-4)/60 + .5/60`.
- **Preview flicker/judder:**
  - Preview time must come from the wall clock with drift sync, not frame counting.
  - Skip drawing a video that is `seeking` or `readyState<2`.
  - Grab frames with rVFC + `createImageBitmap`.
- **"Scratched disc" look:** dotted hatching and dark blue-grey blocks on the screen near the hinge, in playback AND render. Root cause: **z-fighting**. The screen sits 0.0006 above the metal body, and the camera ~25 units away had near 0.1 / far 200, which is only ~1.5 depth steps of separation. Rule: keep near/far tight around the subject (`z0/3 … z0*2.5`, already in duo.js). Whenever you add a layer a hair above another, check depth precision ≈ z²/(near·2²⁴).
  - The screen also uses a manual mip pyramid (`Surface` in duo.js); keep it, don't go back to `generateMipmaps`/`textureLod` on per-frame canvas textures.
  - The decoder was never the cause. To isolate a visual defect, first compare the 2D surface canvas against the screenshot, then playback against the render path.
- **Duo fidelity:** projected UI + progressive blur during the fold, faithful to the real device; the folded Duo shows the outer screen.
- **Distorted device:** a narrow (tele) lens flattens the Duo into a card and yaw reads as skew. Rule: keep the 24° lens (`lens: 1`); fix depth precision with tight near/far, never by changing the lens.
- **Duo fold blur (matches the real Duo / Expo ref):** only the moving leaf blurs; the fixed leaf stays sharp; blur ramps evenly from hinge (sharp) to free edge (`edge^2.2`); on close the moving leaf also darkens toward its edge. Blur rises at motion start and clears ~0.2 s after landing. No frost at all and a modest radius (R = 28 px per 2670 px of screen): shapes stay readable as soft blobs and dark backgrounds stay dark, like the real device. A big radius smears highlights over the dark UI and reads as a white/grey wash. Never blur the whole screen.
- **No music / no SFX in preview:** the bed was built for an older film length and the preview played only the bed. Rule: rebuild `audio/make_bed.sh` to the film duration, rerun mix.py after any cue change; the preview plays `out/mix.wav`.
- **Aimless motion:** no sine sway; every camera/device key serves a scene (entrance, reveal, slow orbit, push-in, close).
- **Regressions while fixing remarks:** before replacing a working effect, put stills of the last approved render beside the new ones. Fix only what was named; never rebuild.
- **SFX:** fold whooshes quiet and low-mid; every SFX short and soft.
- **Joints:** check every clip joint and scene change in the preview.

## Done means
- `audit.py` exit 0.
- `playcheck.mjs` exit 0, with clean sheets of whole frames and hinge strips.
- Render-path stills at the open/close points.
- Silent + sound versions at the requested size (default 2160²), with ffprobe showing 60/1 CFR.
- Temp files listed for the user before anything is deleted.
