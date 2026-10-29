# How the user works (process, not taste)

Taste lives in `AESTHETICS.md`, defect handling in `TROUBLESHOOTING.md`.

## How they talk
- Vietnamese, short remarks, often with a screenshot or a real-device photo. Answer in Vietnamese, short.
- They prompt out of order and don't repeat themselves. Every remark becomes a row in `REQUESTS.md` and an item in the task list before any work. Re-check the whole list before each reply.
- A rule, preference or correction goes to memory (and to the right kit page) in the same turn.
- An ambiguous remark ("wrong", "still the old one", "ugly"): ask once which screen/element/state, then act.
- A "why" question: answer with the mechanism plus the structural fix, never a symptom list.
- Read remarks by intent:
  - "ugly" = improve it. It never means delete.
  - "stands out too much" = too strong or too dark. Tone it down; don't remove it.
  - "stop" = stop everything, including agents and renders.
  - "lighter render" = smaller file and lighter machine load, same look.

## What they expect
- **Speed.** Do what was asked without re-asking for approval. Decide trivia silently (9:41 vs 09:41 does not matter).
- **Exact scope.**
  - Fix the named spot only.
  - A screenshot is the exact list of targets.
  - Never rebuild, redesign or swap a working effect.
  - Never offer "version A or version B": combine the best yourself.
- **Their assets are theirs.** Never redesign their icon or logo; only sharpen or recolour on request. Upgrade their existing set incrementally instead of starting over.
- **Self-audit.** Check every output against the request and the references before showing it. Never show broken intermediate states.
- **Honesty.**
  - Report done / open / not checked per request row.
  - Own mistakes plainly.
  - `BUILD SUCCEEDED` or "the code changed" is not "fixed".
- **Shipping over endless testing.** Verify with stills and contact sheets, not with test renders.
- **Fewer checkpoints.**
  - Lock decisions in one brief.
  - Two checkpoints: the style frame, then the full preview.
  - One session per job; no late tempo or style changes.
  - Show 1–2 samples before producing a full set.

## Gates (ask, then move fast)
| Action | Gate |
|---|---|
| Render a film | live HTML preview with a scrubber first, render on OK |
| Test clips / renders | none unless asked; verify with stills |
| Paid generation (Scenario, any credit API) | quote the cost (simulate_cost), wait for yes |
| Download | name, source, size, wait for yes; untrusted dir, Python `-I` |
| Delete files / sims / branches | exact paths or UDIDs in the same reply, keep working meanwhile, delete on the first yes, no second confirmation |
| Boot an emulator / simulator | only what the job needs, at most one at a time; Android: prefer the real device, ask before booting an emulator |
| Global dev-tool changes (LLDB hooks, system settings) | ask first |
| Commit | only when asked, on the current main branch, no new branch/worktree; never mention it before checks are reported |
| Push / publish / create a remote | ask first |

## Machine and sessions
- One simulator/emulator booted at most. Shut down sims, camera injectors and temp files afterwards; the disks are small.
- Heavy jobs (Demucs, Whisper, renders, ML):
  - Run one at a time, with `nice -n 10`.
  - Prefer CPU over MPS, because an MPS GPU hang once rebooted the Mac mini.
  - Process in chunks and watch RSS.
- Parallel work:
  - Use agents with `model: "opus"`.
  - No parallel simulator agents unless asked.
  - Stop all agents when the user says stop.
- While testing on a device, say only "testing" and report once at the end.
- A session brief carries:
  - the user's words translated faithfully into English, plus their screenshot
  - what must stay
  - the current state
  Never pass along your own interpretation as a rule.
- Repeated work becomes skill scripts the same day.
- Clean up after delivery: node_modules, caches, raw media you created, empty `parts/` folders. List the paths first.
- No unsolicited comments in code.
