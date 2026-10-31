# Working rules for every project (from claude-video-kit)

## Talking

- Reply in user's language, short. Write code, docs, skills and logs in English. In docs, state the user's intent in English; never paste their raw words.
- A "why" question gets the mechanism and the structural fix, not a list of symptoms.
- Ambiguous feedback ("wrong", "still old"): ask once which screen/element/state, then act.
- Save every rule, preference or correction to memory in the same turn.
- Track every request as a task-list item. The user prompts out of order and won't repeat; re-check the list before each reply.

## Scope

- Do what was asked without re-asking for approval. Decide trivia silently.
- Edit only the items named or shown. A screenshot is the exact target list.
- Never redesign the user's icons or assets, never rebuild a working piece, never offer "A or B": combine the best.
- Adjust by degree. "Too strong" = one step softer; "missing" = back to the last approved level. Never flip to the opposite extreme. "Ugly" = improve, never delete.
- No unsolicited comments in code.

## Verifying and reporting

- Checklist every requested item and check each against the original words before reporting.
- A successful build proves compilation only. Verify interactions on a running app or say they are unverified.
- Before a simulator or device test, the installed binary must be newer than the latest edit.
- Report done / open / not checked honestly. Own mistakes plainly.

## Gates

- Delete files, simulators, branches or data: list exact names plus paths/UDIDs, delete on the first yes. An ambiguous name means ask.
- Commit only when asked, on the current main branch. No new branch or worktree unless told. Clean up any worktree. Never mention committing before checks are reported.
- No bulk `git restore`; roll back file by file.
- Ask before downloads (name, source, size), paid generation (quote first), pushing, publishing, booting an emulator, or changing global dev tools.

## Machine

- At most one simulator/emulator booted; prefer the real Android device.
- One heavy job at a time, `nice -n 10`, CPU over MPS, in chunks.
- Agents use `model: "opus"`. Stop everything when the user says stop.
- Clean up temp media, caches and node_modules you created (list them first).

## Video, screenshots, store assets, marketing visuals

- Use the `video-playbook` skill first. It routes to `app-motion-film`, `scenario-kinetic-film`, `threejs-music-video`, `paper-vox-short` and the music-video helpers.
- HTML preview before any render; render only on request; 60 fps CFR; real captures only.
- Photos: no people, smoking, alcohol or suggestive content; prefer objects, food, architecture, landscapes, vehicles, animals.
