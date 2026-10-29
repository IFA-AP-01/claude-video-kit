#!/usr/bin/env bash
# Full analysis pipeline. Run from the project's analysis/ folder:  ./run_all.sh
# Each stage caches its heavy work in stems/ and work/; delete those to start over.
set -euo pipefail
cd "$(dirname "$0")"
for s in separate whisper_run align analyze qa; do
  echo "== $s"
  uv run python "$s.py"
done
