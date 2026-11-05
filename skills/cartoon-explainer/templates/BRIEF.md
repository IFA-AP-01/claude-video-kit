# BRIEF — <video name>

Fill **once before starting**. Everything here counts as decided: Claude builds end to end from it and
stops only at the checkpoints in §6. To change something midway, edit this file and say "brief changed §X".

## 1. Settings (make.sh reads this block, keep KEY=value)
```ini
VOICE=voice.mp3        # voice file in the project folder
SCRIPT=script.txt      # script; a [Tag] on its own line starts a section (= one scene)
LANGUAGE=vi            # voice language for alignment (vi, en, ...)
TEMPO=0.88             # voice speed, applied BEFORE alignment (TTS reads feel rushed above ~185 wpm)
PITCH=0                # semitones up (+) or down (-), formants kept (rubberband); 0 = no shift
LOW_TRIM=0             # dB on the 100-400 Hz voice target (full master only); froggy = vocal fry, fixed by DEFRY, not here
END_HOLD=1.5           # seconds held after the last word
INTRO=4.5              # quiet opening: seconds before the first word (own `intro` scene); 0 = none
PAUSE_SECTION=2.0      # min. pause between scenes, s (the voice is widened with its own room tone)
PAUSE_PARA=1.6         # min. pause at a paragraph break in the script
PAUSE_SENTENCE=0.7     # min. pause after a sentence
TONE=                  # optional ffmpeg tone chain (denoise/EQ) before the light-master gain; empty = the raw read
MASTER=light           # light = loudness only (default, keeps the original read) | full = master.py EQ chain
WARMTH=0               # 0 transparent corrective master (bounded 4 dB) | 1 | 2 darker (muffled on TTS, listen-check first)
DEFRY=0                # vocal-fry repair strength (Praat PSOLA on phrase-final word tails from DEFRY_WORDS); 0 off
DEFRY_WORDS=           # raw-voice word times JSON {words:[{w,start,end}]}; without it the whole file is searched (distorts)
DEFRY_TAIL_DB=-10      # dB on deep phrase tails inside the repaired word windows
DECLICK=1              # targeted vocoder-click repair above 3 kHz (Gemini TTS ~80 clicks/min); 0 off
LOUDNESS=-14           # LUFS of the voice master and the final mix; -14 default, a project may raise or lower it
SFX_DB=3               # whole SFX bus, dB
SFX_LIGHT=             # comma list of ironic/light scenes that keep comic SFX (a step softer); every other scene is tender
MUSIC=                 # music bed (audio/music.mp3) or per-phase plan (audio/music/plan.json); empty = none
MUSIC_DB=-20           # music vs voice under speech, dB
STINGS=                # situational stingers plan (audio/sting/plan.json); empty = none
BRAND=                 # channel name, one logo bug bottom-right (empty = BRAND placeholder)
WORKERS=2              # render workers (each one is a Chrome, ~256 MB)
FORMAT=landscape       # landscape 1920×1080 | vertical 1080×1920 (Shorts / Reels / TikTok)
CAPTIONS=0             # 1 = karaoke captions over the whole film (compositions/captions.html)
CHAPTERS=              # chapter cards: id|Title|mood,... (empty Title = no card, only the mood grade); empty = none
PAUSE_CHAPTER=0        # min. pause before a chapter-start section (chapter card), s; 0 = PAUSE_SECTION
OUTRO=0                # closing `outro` scene after the last word, s (replaces END_HOLD); 0 = none
```

## 2. Content
- Topic / angle (1–2 sentences):
- Tone: curious explainer (hook question → facts → mechanism → stakes → twist/caveat)
- Format: FORMAT above (16:9 1920×1080 or 9:16 1080×1920), 60 fps

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
