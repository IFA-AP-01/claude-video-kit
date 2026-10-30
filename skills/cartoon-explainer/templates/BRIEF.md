# BRIEF — <video name>

Fill **once before starting**. Everything here counts as decided: Claude builds end to end from it and
stops only at the checkpoints in §6. To change something midway, edit this file and say "brief changed §X".

## 1. Settings (make.sh reads this block, keep KEY=value)
```ini
VOICE=voice.mp3        # voice file in the project folder
SCRIPT=script.txt      # script; a [Tag] on its own line starts a section (= one scene)
LANGUAGE=vi            # voice language for alignment (vi, en, ...)
TEMPO=1.0              # voice speed, applied BEFORE alignment
END_HOLD=1.5           # seconds held after the last word
PAUSE_SECTION=2.0      # min. pause between scenes, s (the voice is widened with its own room tone)
PAUSE_PARA=1.6         # min. pause at a paragraph break in the script
PAUSE_SENTENCE=0.7     # min. pause after a sentence
WARMTH=1               # -1 natural speech (LTASS) | 0 | 1 | 2 warmer
LOUDNESS=-14           # LUFS
SFX_DB=3               # whole SFX bus, dB
MUSIC=                 # music bed (audio/music.mp3) or per-phase plan (audio/music/plan.json); empty = none
MUSIC_DB=-20           # music vs voice under speech, dB
STINGS=                # situational stingers plan (audio/sting/plan.json); empty = none
BRAND=                 # channel name, one logo bug bottom-right (empty = BRAND placeholder)
WORKERS=2              # render workers (each one is a Chrome, ~256 MB)
```

## 2. Content
- Topic / angle (1–2 sentences):
- Tone: curious explainer (hook question → facts → mechanism → stakes → twist/caveat)
- Length: 16:9 1920×1080, 60 fps

## 3. Scenes
One row per `[Tag]` section (`film/compositions/<id>.html`). Cast keys: `exec`, `scientist`, `worker`,
`analyst`, `guy` (more in `film/assets/lib/cast.js`). Backgrounds: `office`, `server`, `street`,
`factory`, `lab`, `studio` (title cards).

| id | opening line | setting | cast | overlays (bubble / pill / kinetic / chart / name card / pin) |
|---|---|---|---|---|
| | | | | |

## 4. Numbers and names on screen
- Spoken numbers → on-screen figure (e.g. "bốn nghìn" → "4,000"):
- Names TTS reads differently → `analysis/config.json` `spoken`:
- Real people appear as generic cast + name card; no real logos.

## 5. Don'ts
- No logos/characters of other channels; no real brand marks (names as text only).
- Fonts with Vietnamese glyphs only (Nunito; HyperFrames embeds it at render because `index.html` declares it).
- Other:

## 6. Checkpoints (default 2 — stop only here)
1. **Style frame**: the first scene finished, in the live preview → approve characters, colours, pacing.
2. **Full preview**: every scene + SFX mix in the live preview; one round of notes as
   `scene <id>, m:ss.ff, issue, suggestion`.
After checkpoint 2: fix the notes → `./make.sh final` (only when told to render).
