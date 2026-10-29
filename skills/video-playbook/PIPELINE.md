# Technical pipeline (any film or store asset)

## 1. Determinism
- Every frame is a pure function of `t`:
  - No `Date.now`, `Math.random` without a seed, or physics that accumulates state.
  - Every animated layer is time-driven, including CSS and Web Animations (set `currentTime`).
- The page exposes `seek(t)`. Preview and render both call it.
- The preview has `?t=` in the URL, a HUD, keys (space / arrows) and a scrubber.
- Never freeze a layer to hide a loop seam. Crossfade the last second into a frame-0 clone instead.

## 2. Capture (real screens)
- iOS Simulator:
  - `xcrun simctl io <udid> recordVideo --codec=h264 [--display=<id>]`. Display IDs change per boot; list them with `simctl io <udid> enumerate`.
  - `simctl` cannot fold an iPhone Duo. Use DeviceHub's posture buttons (AXPress, help "Closed"/"Open"). Scripting DeviceHub fails while the Mac is locked: tell the user.
- The installed binary must be newer than the latest source edit. Rebuild and reinstall first.
- Temporary unlock flags (e.g. a Pro flag):
  - Make it one line.
  - Remove it right after capture, then rebuild and reinstall.
  - Never commit it.
- Camera feeds come from an injector app (e.g. SimCamLite). Don't hack the camera code. Reset the injector afterwards.
- Tap slowly with pauses so cut points fall inside still holds.
- Android: capture on the real device unless the user allows an emulator.

## 3. Clean the recordings
- `simctl recordVideo` is VFR and drops frames during scrolls. The fix chain is in `app-motion-film/scripts`:
  1. `cfr.sh` converts to 60 fps CFR.
  2. `fixdup.py` fills duplicate runs with optical flow.
  3. `bake.py` builds one track per screen, with frame-blended rates and dissolves.
  4. `audit.py` finds frozen frames; exit 1 means fix before continuing.
- Check frame uniqueness with PSNR (> ~60 dB = identical). Don't rely on tblend/YAVG.
- Seek with `floor(t*60+1e-4)/60 + .5/60` to avoid off-by-one frames.

## 4. Preview (checkpoint before any render)
- Serve with `python3 -m http.server` and open the film page with `?t=`.
- Browser panes in the app are throttled to about 1 fps:
  - Never judge smoothness there.
  - Measure with `app-motion-film/scripts/playcheck.mjs` instead (≥50 fps, 1.00×, no errors).
- After editing JS or CSS, bust the cache (`fetch(url,{cache:'reload'})`) and reload before claiming a fix.
- Contact sheets:
  - `ffmpeg -pattern_type glob -i 'frames/*.png' -vf "scale=400:-2,tile=6x6" sheet.png`
  - plus full-res crops of problem areas
  - plus render-path stills (`scenario-kinetic-film/scripts/snap.mjs`) at every joint

## 5. Render
- Render only after the user approves the preview, and only what they asked for. No test clips.
- Headless Chrome → frames → ffmpeg pipe: h264 high, yuv420p, crf 16, `+faststart`.
- Frame rate:
  - 60 fps constant for store and social videos. Music videos and shorts may use 30 fps when the skill says so.
  - Always verify with `ffprobe -show_entries stream=r_frame_rate,avg_frame_rate`: both must be `60/1`.
- WebGL in headless mode: `--use-angle=metal`, falling back to `--enable-unsafe-swiftshader`.
- Render into a fresh `out/rN/` folder so the old deliverable survives until the new one passes.
- Deliver two versions:
  - a silent one
  - `_sfx`, with an audio stream; verify it with ffprobe and check its mean/peak volume
- Size as asked. 1080 for drafts and social, 2160/4K when requested. Machine-heavy renders use `--soft`/`nice`.

## 6. Sound
- Music is the user's track. If something can't be made locally, give the user an exact spec (length, BPM, mood, format) to source.
- Build the bed to the exact film duration. Re-mix after any cue change. The preview plays the real mix.
- SFX:
  - Synthesizing them locally is fine: sine/noise shaped, lowpassed clicks, low-mid whooshes ~1–1.3 s.
  - Paid SFX generation needs a quote first.
- Voice:
  - Enhance on CPU first.
  - Splice retakes at the measured cut points.
  - Duck the music under the voice.
  - Shorts master at −14 LUFS.

## 7. Machine safety
- One heavy job at a time, with `nice -n 10`. Prefer CPU over MPS (an MPS hang rebooted the Mac mini M4). Process in chunks; watch RSS.
- At most one simulator booted.
- Put downloads in their own new folder; run Python on them with `-I`; read the code before running it.
- Delete temp media, profiles (`/tmp/shot`), node_modules and raw captures you created once delivered. List the paths first.
