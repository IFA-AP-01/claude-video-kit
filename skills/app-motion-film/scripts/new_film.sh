#!/bin/sh
# new_film.sh <folder> [template film folder]: new film folder starting from the skill template (or a finished film).
set -e
S=$(cd "$(dirname "$0")/.." && pwd); D="$1"; T="${2:-$S/template}"
[ -n "$D" ] || { echo "usage: new_film.sh <folder> [template film folder]"; exit 1; }
[ -e "$D" ] && { echo "$D exists, pick a new folder"; exit 1; }
mkdir -p "$D/assets/cap" "$D/audio/music" "$D/audio/sfx" "$D/out"
for f in index.html main.js core.js compositor.js blocks.js duo.js spec.js package.json package-lock.json; do [ -f "$T/$f" ] && cp "$T/$f" "$D/"; done
cp -R "$T/fonts" "$D/"; cp "$T"/audio/sfx/* "$D/audio/sfx/" 2>/dev/null || true
cp "$T"/audio/*.py "$T"/audio/*.sh "$D/audio/" 2>/dev/null || true
cp "$T"/assets/*.png "$D/assets/" 2>/dev/null || true
if [ -d "$T/node_modules" ]; then ln -s "$T/node_modules" "$D/node_modules"; else (cd "$D" && npm install --silent); fi
echo "film folder ready: $D"
echo "add device art to $D/assets (duo_inner.png, duo_back.png: Apple Design Resources bezels), the app icon as icon.png, tracks in assets/cap"
