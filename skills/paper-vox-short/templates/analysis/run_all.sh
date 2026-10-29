#!/usr/bin/env bash
# Narration alignment pipeline (CPU only — see CLAUDE.md §0). Normally run by ../make.sh align.
# whisper/emissions are cached in work/; make.sh align clears them when the voice is newer.
# Hand fixes: data/lyrics.fix.json (word times), analysis/caption_rules.json (phrase cuts, digits).
# sync_check.py (optional) writes out/sync_check.mp4 — a small ffmpeg render; only when asked.
set -euo pipefail
cd "$(dirname "$0")"
for s in whisper_run align qa captions; do
  echo "== $s"
  nice -n 10 .venv/bin/python "$s.py"
done
