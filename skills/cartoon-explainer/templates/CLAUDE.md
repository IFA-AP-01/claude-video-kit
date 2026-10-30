# Project rules — Cartoon Explainer

Skill: `cartoon-explainer` (read its SKILL.md and references/ first). Settings live in BRIEF.md.

- Pipeline: `./make.sh setup → voice → align → (write scenes) → check → sfx → preview → test → final`.
- Scenes: `film/compositions/<id>.html`, one per script section; build with `TOON.*` helpers only.
  Times from `TOON.scene(id)` (never hard-coded seconds), seeded randomness only.
- HyperFrames rules: `fromTo` not `from`; no `repeat: -1`; no CSS transform on tweened elements;
  never tween `display`/`visibility` of clips; register `window.__timelines[id]` last.
- Keep `font-family: "Nunito"` in `film/index.html` (render embeds only fonts named in HTML); keep
  non-composition pages out of `film/` (Studio lints every `.html` there).
- Machine: software GL (`--no-browser-gpu`), `nice -n 10`, one heavy job at a time, telemetry off
  (`HYPERFRAMES_NO_TELEMETRY=1 DO_NOT_TRACK=1`); never `snapshot --describe`, `publish`, `cloud`,
  `feedback`, `auth`.
- Two checkpoints (style frame, full preview). Render only when the user says so; 3 s test first.
- Log every defect and its fix in the skill's `references/lessons.md`.
