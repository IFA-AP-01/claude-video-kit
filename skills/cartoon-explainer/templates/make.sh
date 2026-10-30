#!/usr/bin/env bash
# Cartoon Explainer — one driver for every step (settings from the ```ini block in BRIEF.md).
#
#   ./make.sh setup            film: npm install + gsap copy + bake; audio/analysis: uv sync
#   ./make.sh bake             soft (blurred) backgrounds, foreground props, grain → assets/bg/*.png
#   ./make.sh voice            master → tempo + end hold → audio/out/voice_master.wav
#   ./make.sh align            script → lines → whisper → align → data/words.json → pauses → build film
#   ./make.sh pauses           widen scene / paragraph / sentence pauses (room tone), shift word times
#   ./make.sh film             rebuild film/ from data/words.json (scene hosts, timings, audio)
#   ./make.sh check            hyperframes check + one snapshot per scene → out/check/
#   ./make.sh sfx              cue export → mix (SFX_DB, MUSIC/MUSIC_DB) → final_mix.wav → film
#   ./make.sh test             first 3 s rendered → out/test.mp4
#   ./make.sh final            3 s test, then the full render → out/explainer.mp4 (60 fps)
#
# Machine safety: software GL only (--no-browser-gpu), nice -n 10, one heavy job at a time,
# telemetry off, never `snapshot --describe` (it uploads frames).
set -euo pipefail
cd "$(dirname "$0")"
ROOT=$PWD

VOICE=voice.mp3 SCRIPT=script.txt LANGUAGE=vi TEMPO=1.0 END_HOLD=1.5 WARMTH=1 LOUDNESS=-14 SFX_DB=3
MUSIC= MUSIC_DB=-20 STINGS= BRAND= WORKERS=2
PAUSE_SECTION=2.0 PAUSE_PARA=1.6 PAUSE_SENTENCE=0.7
if [[ -f BRIEF.md ]]; then
  while IFS='=' read -r k v; do
    v=${v%%#*}; v=${v%"${v##*[![:space:]]}"}; v=${v#"${v%%[![:space:]]*}"}
    [[ -n $v ]] && printf -v "$k" '%s' "$v"
  done < <(grep -E '^(VOICE|SCRIPT|LANGUAGE|TEMPO|END_HOLD|WARMTH|LOUDNESS|SFX_DB|MUSIC|MUSIC_DB|STINGS|BRAND|WORKERS|PAUSE_SECTION|PAUSE_PARA|PAUSE_SENTENCE)=' BRIEF.md)
fi

export HYPERFRAMES_NO_TELEMETRY=1 DO_NOT_TRACK=1 HYPERFRAMES_SKIP_SKILLS=1
NICE=(nice -n 10)
HF=$ROOT/film/node_modules/.bin/hyperframes
say() { printf '\n== %s\n' "$*"; }
die() { printf 'make.sh: %s\n' "$*" >&2; exit 1; }

busy() {
  local p
  p=$(pgrep -fl 'hyperframes (render|snapshot|check)|whisper_run\.py|align\.py|enhance\.py' 2>/dev/null \
      | grep -vE "^($$|[0-9]+ (/bin/)?(-?zsh|bash|sh|u?grep|pgrep)( |$))" || true)
  [[ -z $p ]] || die "another heavy job is running — wait for it (one at a time):
$p"
}

need_venv() { [[ -x $1/.venv/bin/python ]] || die "$1/.venv missing — run ./make.sh setup"; }
need_film() { [[ -x $HF ]] || die "film/node_modules missing — run ./make.sh setup"; }

cmd_setup() {
  say "film: npm install"
  (cd film && npm install --no-fund --no-audit)
  cp film/node_modules/gsap/dist/gsap.min.js film/assets/lib/gsap.min.js
  cmd_bake
  say "analysis: uv sync"
  (cd analysis && uv sync)
  say "audio: uv sync"
  (cd audio && uv sync)
}

cmd_bake() {
  say "bake soft backgrounds, blurred foreground props, grain"
  local rooms=() fgs=()
  for f in film/assets/bg/*.svg; do
    case $(basename "$f") in fg_*) fgs+=("$f") ;; grain.svg|mid_*) ;; *) rooms+=("$f") ;; esac
  done
  node tools/bake_bg.mjs 3 "${rooms[@]}"
  ((${#fgs[@]})) && node tools/bake_bg.mjs 9 "${fgs[@]}"
  node tools/bake_bg.mjs 0 film/assets/bg/grain.svg
}

cmd_voice() {
  need_venv audio; busy
  [[ -f $VOICE ]] || die "voice file $VOICE not found"
  mkdir -p audio/out/1.0x
  say "master (warmth $WARMTH, $LOUDNESS LUFS)"
  "${NICE[@]}" audio/.venv/bin/python audio/master.py "$VOICE" audio/out/1.0x/voice_master.wav \
    --warmth "$WARMTH" --loudness "$LOUDNESS"
  say "tempo $TEMPO + end hold $END_HOLD s"
  audio/.venv/bin/python audio/tempo.py "$TEMPO" --hold "$END_HOLD"
  rm -f audio/out/final_mix.wav
}

cmd_film() {
  [[ -f data/words.json ]] || die "no data/words.json — run ./make.sh align"
  node tools/build_film.mjs ${BRAND:+--brand "$BRAND"}
}

cmd_align() {
  need_venv analysis; busy
  [[ -f audio/out/voice_master.wav ]] || die "no audio/out/voice_master.wav — run ./make.sh voice"
  say "script → analysis/lines.txt"
  python3 analysis/make_lines.py "$SCRIPT"
  python3 - "$LANGUAGE" <<'PY'
import json, os, sys
f = "analysis/config.json"; c = json.load(open(f))
if c.get("language") != sys.argv[1]:
    c["language"] = sys.argv[1]
    json.dump(c, open(f, "w"), ensure_ascii=False, indent=2)
    if os.path.exists("analysis/work/whisper.json"): os.remove("analysis/work/whisper.json")
PY
  mkdir -p analysis/stems analysis/work
  ln -sf ../../audio/out/voice_master.wav analysis/stems/vocals.wav
  for c in analysis/work/whisper.json analysis/work/emission_mms.npy analysis/work/stem_offset.json; do
    [[ -f $c && audio/out/voice_master.wav -nt $c ]] && rm -f "$c" && echo "  stale cache dropped: $c"
  done
  say "align (CPU, ~1 min)"
  analysis/run_all.sh
  echo "QA: data/qa_report.md (low-confidence words) — fix in data/lyrics.fix.json, then ./make.sh align"
  cmd_pauses
}

cmd_pauses() {
  need_venv audio
  [[ -f data/words.json ]] || die "no data/words.json — run ./make.sh align"
  say "pauses (scene $PAUSE_SECTION s, paragraph $PAUSE_PARA s, sentence $PAUSE_SENTENCE s)"
  audio/.venv/bin/python audio/pauses.py --section "$PAUSE_SECTION" --para "$PAUSE_PARA" --sentence "$PAUSE_SENTENCE"
  say "film"
  cmd_film
}

cmd_check() {
  need_film; busy
  [[ -f film/assets/data/words.js ]] || die "run ./make.sh align (or film) first"
  say "hyperframes check"
  (cd film && "${NICE[@]}" "$HF" check --json --no-browser-gpu > ../out/check.json) || true
  node -e '
    const r = JSON.parse(require("fs").readFileSync("out/check.json", "utf8"));
    const all = [];
    for (const [k, v] of Object.entries(r)) if (v && Array.isArray(v.findings)) for (const f of v.findings) if (f.severity !== "info") all.push([k, f]);
    console.log("check:", r.ok === false ? "FAIL" : "ok", "-", all.length, "warning/error finding(s)");
    for (const [k, f] of all) console.log("  ", k, f.severity, f.code, (f.message || "").slice(0, 220));
  ' || head -40 out/check.json
  local ts
  ts=$(node -e '
    global.window = {}; require("./film/assets/data/words.js");
    const D = window.TOON_DATA;
    console.log(D.sections.map((s) => Math.min(s.start + 1.6, (s.start + s.end) / 2).toFixed(2)).join(","));')
  say "snapshots at $ts"
  rm -rf out/check && mkdir -p out/check
  (cd film && "${NICE[@]}" "$HF" snapshot --at "$ts" --no-browser-gpu -o ../out/check)
  ls out/check
}

cmd_sfx() {
  need_venv audio; need_film; busy
  cmd_film > /dev/null
  say "cue export"
  "${NICE[@]}" node tools/cues.mjs
  local music=()
  [[ -n $MUSIC ]] && music=(--music "$MUSIC" --music-db "$MUSIC_DB")
  [[ -n $STINGS ]] && music+=(--stings "$STINGS")
  say "mix (SFX bus $SFX_DB dB${MUSIC:+, music $MUSIC at $MUSIC_DB dB}${STINGS:+, stings $STINGS})"
  "${NICE[@]}" audio/.venv/bin/python audio/mix.py --sfx-db "$SFX_DB" ${music[@]+"${music[@]}"}
  cmd_film
  echo "preview now plays final_mix.wav (reload the page)"
}

render() {
  local dir=$1 out=$2 q=$3
  "${NICE[@]}" "$HF" render "$dir" --fps 60 -q "$q" --no-browser-gpu -w "$WORKERS" -o "$out"
}

cmd_test() {
  need_film; busy
  say "test: first 3 s"
  local t=out/.test-film
  rm -rf "$t" && mkdir -p out
  rsync -a --exclude node_modules --exclude renders --exclude .hyperframes film/ "$t/"
  sed -i '' -E 's/(id="(root|logo-l|logo-r|mix)"[^>]*data-duration=")[^"]*"/\13"/' "$t/index.html"
  render "$t" "$ROOT/out/test.mp4" draft
  rm -rf "$t"
  ffprobe -v error -show_entries stream=codec_type,width,height,r_frame_rate:format=duration -of compact out/test.mp4
}

cmd_final() {
  [[ -f audio/out/final_mix.wav ]] || echo "warning: no final_mix.wav — rendering with the voice only (run ./make.sh sfx)"
  cmd_test
  busy
  say "full render (60 fps, software GL)"
  (cd film && render . "$ROOT/out/explainer.mp4" delivery)
  ffprobe -v error -show_entries stream=codec_type,width,height,r_frame_rate:format=duration -of compact out/explainer.mp4
  ffmpeg -hide_banner -nostats -i out/explainer.mp4 -af ebur128=peak=true -f null - 2>&1 | grep -E '^\s+(I|Peak):'
}

case ${1:-help} in
  setup) cmd_setup ;;
  bake) cmd_bake ;;
  voice) cmd_voice ;;
  align) cmd_align ;;
  pauses) cmd_pauses ;;
  film) cmd_film ;;
  check) cmd_check ;;
  sfx) cmd_sfx ;;
  test) cmd_test ;;
  final) cmd_final ;;
  settings) echo "VOICE=$VOICE SCRIPT=$SCRIPT LANGUAGE=$LANGUAGE TEMPO=$TEMPO END_HOLD=$END_HOLD WARMTH=$WARMTH LOUDNESS=$LOUDNESS SFX_DB=$SFX_DB MUSIC=$MUSIC MUSIC_DB=$MUSIC_DB STINGS=$STINGS BRAND=$BRAND WORKERS=$WORKERS PAUSE_SECTION=$PAUSE_SECTION PAUSE_PARA=$PAUSE_PARA PAUSE_SENTENCE=$PAUSE_SENTENCE" ;;
  *) sed -n '2,13p' "$0" | sed 's/^# \{0,1\}//' ;;
esac
