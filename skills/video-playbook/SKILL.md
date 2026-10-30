---
name: video-playbook
description: Start here for ANY video, motion film, promo, music video, explainer short, App Store / Google Play screenshot, store header or search video, feature graphic, landing-page media or other marketing visual, in any project. It holds the user's working style, aesthetic judgment, defect handling, store specs, the render/sound/machine pipeline and every lesson from past video work, and routes to the specialised skills.
---

# Video & store-asset playbook (all projects, all machines)

Read these before the first tool call of any visual job. Each page covers one area; do not mix them:

| Page | Covers |
|---|---|
| `WORKING-STYLE.md` | how the user works: language, logging, gates, scope, honesty, machine |
| `AESTHETICS.md` | what looks right: principles, type, colour, motion, sound |
| `TROUBLESHOOTING.md` | how to handle a remark or defect: root cause, one change, adjust by degree, verify |
| `PIPELINE.md` | technical method: capture, 60 fps, determinism, preview, render, sound, delivery, machine safety |
| `STORE-ASSETS.md` | Apple App Store and Google Play sizes, limits and board rules |
| `LESSONS.md` | every incident from past projects: root cause → rule |
| `templates/` | `REQUESTS.md` (log of the user's words) and `SPEC.md` (acceptance rules) to copy into a new project |

## Route to the specialised skill
| Job | Skill |
|---|---|
| Film from real app screens, 3D iPhone Duo / device, kinetic type | `app-motion-film` (engine `scenario-kinetic-film`) |
| Beat-driven kinetic-type film, music + SFX, render/mix/finish scripts | `scenario-kinetic-film` |
| Three.js music video (deterministic frames, Chrome → ffmpeg) | `threejs-music-video` + `lyric-beat-analysis`, `camera-motion`, `lyric-staging`, `toon-look` |
| Vox-style paper explainer short with voice-over | `paper-vox-short` |
| Infographics-Show-style 16:9 cartoon explainer (talking puppets, bubbles, stat pills, charts) from voice + script | `cartoon-explainer` |
| Store screenshots / boards / header image | this playbook (`STORE-ASSETS.md`) + the project's own board page |

## First five minutes of any job
1. Create `REQUESTS.md` (from `templates/`) in the project's marketing folder and log each request in English with its exact meaning. Put every item into the task list.
2. Gather references: what the user sent, real store listings, Apple/Google guidelines, real device photos. Look before designing.
3. Lock the decisions in one brief (content, length, size, music, look). Ask once, only what has no default.
4. Write project-specific facts (UDIDs, paths, flags, brand) into the project's own `PLAYBOOK.md`, never into this kit.
5. Plan two checkpoints only: a style frame, then the full HTML preview. Render after the preview is approved.
