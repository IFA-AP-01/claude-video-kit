#!/usr/bin/env bash
# new_film.sh <project dir> [words.js] [mix.wav]
set -euo pipefail
[ $# -ge 1 ] || { echo "usage: new_film.sh <project dir> [words.js] [mix.wav]"; exit 1; }
SK="$(cd "$(dirname "$0")/.." && pwd)"
DST="$1"
[ -e "$DST/film.html" ] && { echo "exists: $DST/film.html"; exit 1; }
mkdir -p "$DST/assets"
cp "$SK/templates/film.html" "$SK/templates/kit.js" "$DST/"
cp -R "$SK/templates/vendor" "$DST/vendor"
[ $# -ge 2 ] && cp "$2" "$DST/assets/words.js"
[ $# -ge 3 ] && cp "$3" "$DST/assets/mix.wav"
ABS="$(cd "$DST" && pwd)"
echo "scaffolded $ABS"
echo "launch.json entry:"
echo "  {\"name\":\"kurz-film\",\"runtimeExecutable\":\"python3\",\"runtimeArgs\":[\"-m\",\"http.server\",\"8765\",\"-d\",\"$ABS\"],\"port\":8765}"
echo "open http://localhost:8765/film.html?t=0"
