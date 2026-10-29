# Spec (single source of truth)

Every session reads this file before capturing, designing or rendering. When the user changes a rule, edit this file first, then brief the sessions. Each session runs the acceptance checks on its own output and updates Status.

## Deliverables
| # | Item | Size / fps / length | Source (real capture, photo, track) | Acceptance check | Status |
|---|---|---|---|---|---|
| 1 | | | | | open |

## Look (locked in the brief)
| Item | Rule |
|---|---|
| Palette / background | |
| Type | |
| Device frame | |
| Motion | |
| Sound | |

## Checks before showing the user
- Every row above matches the request log.
- Real captures only; fresh build; temporary flags removed.
- Videos: ffprobe 60/1 CFR, duration within limits, `_sfx` version has audio.
- Contact sheet viewed; joints checked; compared with the reference.
