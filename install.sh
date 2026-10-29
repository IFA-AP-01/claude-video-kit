#!/bin/sh
# ./install.sh            link every skill into ~/.claude/skills and import user/CLAUDE.md
# ./install.sh uninstall  remove those links and the import block
set -e
KIT=$(cd "$(dirname "$0")" && pwd)
SK="$HOME/.claude/skills"; CM="$HOME/.claude/CLAUDE.md"
BEGIN="# >>> claude-video-kit >>>"; END="# <<< claude-video-kit <<<"
mkdir -p "$SK"

strip_block() { [ -f "$CM" ] && awk -v b="$BEGIN" -v e="$END" '$0==b{s=1;next} $0==e{s=0;next} !s' "$CM" > "$CM.tmp" && mv "$CM.tmp" "$CM" || true; }

if [ "$1" = uninstall ]; then
  for d in "$KIT"/skills/*/; do n=$(basename "$d"); l="$SK/$n"
    [ -L "$l" ] && [ "$(readlink "$l")" = "${d%/}" ] && rm "$l" && echo "unlinked $n"; done
  strip_block; echo "import block removed from $CM"; exit 0
fi

BK="$HOME/.claude/skills-backup-$(date +%Y%m%d-%H%M%S)"
for d in "$KIT"/skills/*/; do n=$(basename "$d"); l="$SK/$n"
  if [ -L "$l" ]; then [ "$(readlink "$l")" = "${d%/}" ] && { echo "ok      $n"; continue; }; rm "$l"
  elif [ -e "$l" ]; then mkdir -p "$BK"; mv "$l" "$BK/"; echo "backup  $n -> $BK/$n"; fi
  ln -s "${d%/}" "$l"; echo "linked  $n"
done

strip_block
{ [ -s "$CM" ] && echo; echo "$BEGIN"; echo "@$KIT/user/CLAUDE.md"; echo "$END"; } >> "$CM"
echo "import  $CM -> $KIT/user/CLAUDE.md"

K="$KIT/skills/scenario-kinetic-film"
if [ ! -x "$K/.venv/bin/python" ]; then
  python3 -m venv "$K/.venv" && "$K/.venv/bin/python" -m pip install -q numpy opencv-python-headless && echo "venv    scenario-kinetic-film"
else echo "ok      scenario-kinetic-film venv"; fi

for c in ffmpeg ffprobe node python3; do command -v $c >/dev/null || echo "missing $c (brew install ${c%probe})"; done
[ -d "/Applications/Google Chrome.app" ] || echo "missing Google Chrome (headless renders)"
echo "done. Restart Claude Code to load the skills."
