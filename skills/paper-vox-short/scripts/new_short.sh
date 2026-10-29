#!/usr/bin/env bash
# Scaffold a new Paper Vox Short project from the templates.
#
#   new_short.sh <project-dir> <voice-file> <script-file> [photo ...]
#
# Copies app/ audio/ analysis/ + CLAUDE/BRIEF/TREATMENT/NOTICE.md + make.sh, the voice as
# voice.<ext>, the script as script.txt and any photos into assets/raw/. Installs nothing and
# runs no model: next steps are printed at the end (fill BRIEF.md, then ./make.sh setup).
set -euo pipefail
[[ $# -ge 3 ]] || { sed -n '2,8p' "$0" | sed 's/^# \{0,1\}//'; exit 1; }
SKILL=$(cd "$(dirname "$0")/.." && pwd)
T=$SKILL/templates
DIR=$1 VOICE=$2 SCRIPT=$3; shift 3

[[ -f $VOICE ]] || { echo "voice not found: $VOICE" >&2; exit 1; }
[[ -f $SCRIPT ]] || { echo "script not found: $SCRIPT" >&2; exit 1; }
if [[ -e $DIR && -n $(ls -A "$DIR" 2>/dev/null) ]]; then
  echo "$DIR exists and is not empty — pick a new folder" >&2; exit 1
fi

mkdir -p "$DIR"/{assets/raw,assets/cut,data,out}
DIR=$(cd "$DIR" && pwd)
# templates without build products (node_modules, .venv, caches) — there should be none, but be safe
rsync -a --exclude node_modules --exclude .venv --exclude __pycache__ --exclude 'uv.lock' \
  --exclude 'work/' --exclude 'stems/' --exclude 'out/' --exclude 'models/' \
  "$T/app" "$T/audio" "$T/analysis" "$DIR/"
cp "$T"/{CLAUDE,BRIEF,TREATMENT,NOTICE}.md "$T/make.sh" "$DIR/"
chmod +x "$DIR/make.sh" "$DIR/analysis/run_all.sh"

ext=${VOICE##*.}
cp "$VOICE" "$DIR/voice.$ext"
cp "$SCRIPT" "$DIR/script.txt"
for p in "$@"; do cp "$p" "$DIR/assets/raw/"; done

# BRIEF settings that follow from the inputs
sed -i '' -e "s|^VOICE=voice.mp3 |VOICE=voice.$ext |" "$DIR/BRIEF.md"
name=$(basename "$DIR")
sed -i '' -e "s|<tên video>|$name|" "$DIR/BRIEF.md" "$DIR/TREATMENT.md"
cat > "$DIR/.gitignore" <<'EOF'
app/node_modules/
audio/.venv/
analysis/.venv/
audio/models/
audio/out/
analysis/stems/
analysis/work/
out/
EOF

# sections the script will produce (no deps; same code the align step uses, dry)
sections=$(cd "$DIR" && python3 - <<'EOF'
import importlib.util, re
spec = importlib.util.spec_from_file_location("ml", "analysis/make_lines.py")
ml = importlib.util.module_from_spec(spec); spec.loader.exec_module(ml)
raw = open("script.txt", encoding="utf-8").read()
if re.search(r"^\s*\[.+\]\s*$", raw, re.M):
    ids = [ml.fold_id(m) for m in re.findall(r"^\s*\[(.+)\]\s*$", raw, re.M)]
else:
    ids = [f"s{i + 1}" for i, p in enumerate(re.split(r"\n\s*\n", raw)) if p.strip()]
print(" ".join(ids))
EOF
)

rel=${DIR#"$PWD"/}
cat <<EOF
scaffolded $DIR
  voice     voice.$ext ($(ffprobe -v error -show_entries format=duration -of csv=p=0 "$DIR/voice.$ext" 2>/dev/null | cut -d. -f1) s)
  sections  $sections   (scenes/<id>.ts; until written each plays scenes/example.ts)
  photos    $# in assets/raw/

next
  1. fill $rel/BRIEF.md (settings block, sections/colours, captions, photos, checkpoints)
  2. cd "$rel" && ./make.sh setup && ./make.sh voice && ./make.sh align
  3. preview: add to the workspace .claude/launch.json →
     {"name": "$name", "runtimeExecutable": "npm", "runtimeArgs": ["--prefix", "$rel/app", "run", "dev"], "port": 5173}
EOF
