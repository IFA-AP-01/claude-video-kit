# TREATMENT — <video name>

Written by Claude after BRIEF, before building scenes. One block per scene; times come from
`data/words.json` (scene-local times in the scene file are `S.at("word")`, `S.line(n).start`).

## <scene id>  (start–end s)
- Shots: cut on sentences (`S.cut(n)`), 2–4 s each; setting + cast per shot
- Character beats: pose on key words (`point`, `shrug`, `handsUp`, `think`, `explain`, `cross`)
- Overlays: what appears on which word (bubble / stat pill / kinetic title / chart / name card / pin)
- Camera: push or pan per shot
- SFX: comes from the helpers (pop, stamp, whoosh, tick); extra cues via `TOON.cue`
