#!/usr/bin/env bash
# Scaffold a new Cartoon Explainer project from the templates.
#
#   new_explainer.sh <project-dir> <voice-file> <script-file>
#
# Copies film/ tools/ + CLAUDE/BRIEF/TREATMENT.md + make.sh from this skill, audio/ and analysis/
# from paper-vox-short (voice master, alignment, SFX synth, mix), the voice as voice.<ext> and the
# script as script.txt. The folder may already hold the voice and script; it must not hold any of
# the copied names. Installs nothing: next steps are printed at the end.
set -euo pipefail
[[ $# -ge 3 ]] || { sed -n '2,8p' "$0" | sed 's/^# \{0,1\}//'; exit 1; }
SKILL=$(cd "$(dirname "$0")/.." && pwd)
T=$SKILL/templates
PV=$(cd "$SKILL/../paper-vox-short/templates" && pwd) || { echo "paper-vox-short skill not found next to $SKILL" >&2; exit 1; }
DIR=$1 VOICE=$2 SCRIPT=$3

[[ -f $VOICE ]] || { echo "voice not found: $VOICE" >&2; exit 1; }
[[ -f $SCRIPT ]] || { echo "script not found: $SCRIPT" >&2; exit 1; }
for x in film tools sheets audio analysis data out make.sh BRIEF.md TREATMENT.md CLAUDE.md script.txt; do
  [[ -e $DIR/$x ]] && { echo "$DIR/$x already exists — pick a new folder" >&2; exit 1; }
done

mkdir -p "$DIR"/{data,out}
DIR=$(cd "$DIR" && pwd)
EX=(--exclude node_modules --exclude .venv --exclude __pycache__ --exclude uv.lock --exclude 'work/'
    --exclude 'stems/' --exclude 'out/' --exclude 'models/' --exclude renders --exclude .hyperframes
    --exclude gsap.min.js)
rsync -a "${EX[@]}" "$T/film" "$T/tools" "$T/sheets" "$DIR/"
rsync -a "${EX[@]}" "$PV/audio" "$PV/analysis" "$DIR/"
cp "$T"/{CLAUDE,BRIEF,TREATMENT}.md "$T/make.sh" "$DIR/"
chmod +x "$DIR/make.sh" "$DIR/analysis/run_all.sh"

ext=${VOICE##*.}
[[ $(cd "$(dirname "$VOICE")" && pwd)/$(basename "$VOICE") -ef $DIR/voice.$ext ]] || cp "$VOICE" "$DIR/voice.$ext"
cp "$SCRIPT" "$DIR/script.txt"

sed -i '' -e "s|^VOICE=voice.mp3 |VOICE=voice.$ext |" "$DIR/BRIEF.md"
name=$(basename "$DIR")
sed -i '' -e "s|<video name>|$name|" "$DIR/BRIEF.md" "$DIR/TREATMENT.md"
cat > "$DIR/.gitignore" <<'EOF'
film/node_modules/
film/renders/
film/.hyperframes/
film/assets/audio/
film/assets/lib/gsap.min.js
audio/.venv/
analysis/.venv/
audio/out/
analysis/stems/
analysis/work/
out/
EOF

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
  sections  $sections   (film/compositions/<id>.html; a placeholder scene until written)

next
  1. fill $rel/BRIEF.md (settings block, brand, cast per section, overlays, checkpoints)
  2. cd "$rel" && ./make.sh setup && ./make.sh voice && ./make.sh align
  3. preview: add to the workspace .claude/launch.json, then preview_start "$name" →
     {"name": "$name", "runtimeExecutable": "/usr/bin/env", "runtimeArgs": ["HYPERFRAMES_NO_TELEMETRY=1", "DO_NOT_TRACK=1", "HYPERFRAMES_SKIP_SKILLS=1", "$DIR/film/node_modules/.bin/hyperframes", "preview", "$DIR/film", "--port", "3002", "--no-open", "--foreground", "--no-browser-gpu"], "port": 3002}
EOF
