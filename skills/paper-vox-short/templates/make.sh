#!/usr/bin/env bash
# Paper Vox Short — one driver for every step (settings from the ```ini block in BRIEF.md).
#
#   ./make.sh setup            npm install + uv sync (+ Resemble Enhance when ENHANCE resolves to yes)
#   ./make.sh voice            [enhance] → master → tempo + end hold → audio/out/voice_master.wav
#   ./make.sh align            script → lines.txt → whisper → align → qa → captions  (data/*.json)
#   ./make.sh captions         captions only (after editing analysis/caption_rules.json)
#   ./make.sh preview          Vite dev server on :5173 (in Claude: preview_start instead)
#   ./make.sh check            typecheck + one --soft still per section → out/check/*.png
#   ./make.sh sfx              cue export → mix (SFX_DB, MUSIC/MUSIC_DB) → audio/out/final_mix.wav
#   ./make.sh test [t0]        3 s --soft clip from t0 → out/test.mp4
#   ./make.sh final            3 s test clip, then the full --soft render → out/short.mp4
#
# Machine safety (CLAUDE.md §0): CPU only, nice -n 10, one heavy job at a time (checked before
# each one), every browser render with --soft (SwiftShader, no GPU).
set -euo pipefail
cd "$(dirname "$0")"
ROOT=$PWD

# ---------------------------------------------------------------- settings from BRIEF.md
VOICE=voice.mp3 SCRIPT=script.txt ENHANCE=auto TEMPO=1.0 END_HOLD=1.5 WARMTH=1 LOUDNESS=-14 SFX_DB=3
MUSIC= MUSIC_DB=-20
if [[ -f BRIEF.md ]]; then
  while IFS='=' read -r k v; do
    v=${v%%#*}; v=${v//[[:space:]]/}
    [[ -n $v ]] && printf -v "$k" '%s' "$v"
  done < <(grep -E '^(VOICE|SCRIPT|ENHANCE|TEMPO|END_HOLD|WARMTH|LOUDNESS|SFX_DB|MUSIC|MUSIC_DB)=' BRIEF.md)
fi

NICE=(nice -n 10)
say() { printf '\n== %s\n' "$*"; }
die() { printf 'make.sh: %s\n' "$*" >&2; exit 1; }

# a heavy job already running (ours or anyone's)? then stop instead of stacking a second one
busy() {
  local p
  p=$(pgrep -fl 'scripts/render\.ts|whisper_run\.py|align\.py|enhance\.py|resemble|--headless' 2>/dev/null \
      | grep -v "pgrep\|$$" || true)
  [[ -z $p ]] || die "another heavy job is running — wait for it (one at a time):
$p"
}

enhance_on() {
  case $ENHANCE in
    yes) return 0 ;;
    no) return 1 ;;
    *) local sr; sr=$(ffprobe -v error -select_streams a:0 -show_entries stream=sample_rate -of csv=p=0 "$VOICE")
       (( sr < 44100 )) ;;
  esac
}

need_venv() { [[ -x $1/.venv/bin/python ]] || die "$1/.venv missing — run ./make.sh setup"; }

cmd_setup() {
  say "app: npm install"
  (cd app && npm install --no-fund --no-audit)
  say "analysis: uv sync"
  (cd analysis && uv sync)
  say "audio: uv sync"
  (cd audio && uv sync)
  if enhance_on; then
    say "audio: Resemble Enhance (ENHANCE=$ENHANCE)"
    (cd audio && uv pip install --no-deps resemble-enhance)
    if [[ ! -d audio/models/resemble-enhance/enhancer_stage2 ]]; then
      if [[ -n ${PAPER_VOX_MODELS:-} && -d $PAPER_VOX_MODELS/resemble-enhance ]]; then
        mkdir -p audio/models && ln -s "$PAPER_VOX_MODELS/resemble-enhance" audio/models/resemble-enhance
      else
        (cd audio && .venv/bin/python -c "from huggingface_hub import snapshot_download as d; d('ResembleAI/resemble-enhance', local_dir='models/resemble-enhance', allow_patterns=['enhancer_stage2/*','enhancer_stage2/**'])")
      fi
    fi
  fi
}

cmd_voice() {
  need_venv audio; busy
  [[ -f $VOICE ]] || die "voice file $VOICE not found"
  mkdir -p audio/out/1.0x out/ab
  local src=$VOICE
  if enhance_on; then
    say "enhance (CPU, chunked; piece 0 first as a test)"
    "${NICE[@]}" audio/.venv/bin/python audio/enhance.py "$VOICE" audio/out/voice_enhanced.wav --only 0
    "${NICE[@]}" audio/.venv/bin/python audio/enhance.py "$VOICE" audio/out/voice_enhanced.wav
    src=audio/out/voice_enhanced.wav
  fi
  say "master (warmth $WARMTH, $LOUDNESS LUFS)"
  "${NICE[@]}" audio/.venv/bin/python audio/master.py "$src" audio/out/1.0x/voice_master.wav \
    --warmth "$WARMTH" --loudness "$LOUDNESS"
  say "tempo $TEMPO + end hold $END_HOLD s"
  audio/.venv/bin/python audio/tempo.py "$TEMPO" --hold "$END_HOLD"
  # 10 s A/B at equal loudness: original vs final master (listen once, BRIEF §7)
  ffmpeg -hide_banner -loglevel error -y -i "$VOICE" -t 10 -af loudnorm=I="$LOUDNESS" -ar 48000 out/ab/0_original.wav
  ffmpeg -hide_banner -loglevel error -y -i audio/out/voice_master.wav -t 10 out/ab/1_master.wav
}

cmd_captions() {
  need_venv analysis
  "${NICE[@]}" analysis/.venv/bin/python analysis/captions.py
}

cmd_align() {
  need_venv analysis; busy
  [[ -f audio/out/voice_master.wav ]] || die "no audio/out/voice_master.wav — run ./make.sh voice"
  say "script → analysis/lines.txt"
  python3 analysis/make_lines.py "$SCRIPT"
  mkdir -p analysis/stems analysis/work
  ln -sf ../../audio/out/voice_master.wav analysis/stems/vocals.wav
  # caches are per voice: drop them when the master is newer
  for c in analysis/work/whisper.json analysis/work/emission_mms.npy analysis/work/stem_offset.json; do
    [[ -f $c && audio/out/voice_master.wav -nt $c ]] && rm -f "$c" && echo "  stale cache dropped: $c"
  done
  say "align (CPU, ~1 min)"
  analysis/run_all.sh
  echo "QA: data/qa_report.md (low-confidence words) — fix in data/lyrics.fix.json, then ./make.sh align"
}

cmd_preview() {
  [[ -d app/node_modules ]] || die "run ./make.sh setup first"
  cd app && exec npm run dev
}

cmd_check() {
  [[ -d app/node_modules ]] || die "run ./make.sh setup first"
  busy
  (cd app && npx tsc --noEmit)
  [[ -f data/words.json ]] || { echo "typecheck ok (no words.json yet: skipping stills)"; return; }
  local ts
  ts=$(python3 -c "
import json; L = json.load(open('data/words.json'))['lines']; seen = []; out = []
for l in L:
    if l['section'] not in seen:
        seen.append(l['section']); out.append(f\"{min(l['start'] + 1.2, l['end']):.2f}\")
print(','.join(out))")
  mkdir -p out/check
  say "stills --soft at $ts"
  (cd app && "${NICE[@]}" npm run still -- --soft --t "$ts")
  mv out/still_*.png out/check/ 2>/dev/null || true
  ls out/check
}

cmd_sfx() {
  need_venv audio; busy
  say "cue export (--soft)"
  (cd app && "${NICE[@]}" npm run cues -- --soft)
  local music=()
  [[ -n $MUSIC ]] && music=(--music "$MUSIC" --music-db "$MUSIC_DB")
  say "mix (SFX bus $SFX_DB dB${MUSIC:+, music $MUSIC at $MUSIC_DB dB})"
  "${NICE[@]}" audio/.venv/bin/python audio/mix.py --sfx-db "$SFX_DB" ${music[@]+"${music[@]}"}
  touch app/src/main.ts   # Vite's eager glob caches the audio list: make it see final_mix.wav
  echo "preview now plays audio/out/final_mix.wav (reload the page)"
}

cmd_test() {
  busy
  local t0=${1:-0}
  local t1; t1=$(python3 -c "print(round($t0 + 3, 2))")
  say "test clip $t0–$t1 s (--soft)"
  mkdir -p out
  (cd app && "${NICE[@]}" npm run render -- --soft --from "$t0" --to "$t1" --preset veryfast --out ../out/test.mp4)
}

cmd_final() {
  [[ -f audio/out/final_mix.wav ]] || echo "warning: no final_mix.wav — rendering with the voice only (run ./make.sh sfx)"
  cmd_test 0
  busy
  say "full render (--soft, ~8 min per minute of video)"
  (cd app && "${NICE[@]}" npm run render -- --soft --out ../out/short.mp4)
  ffprobe -v error -show_entries stream=codec_type,width,height,r_frame_rate:format=duration -of compact out/short.mp4
  ffmpeg -hide_banner -nostats -i out/short.mp4 -af ebur128=peak=true -f null - 2>&1 | grep -E '^\s+(I|Peak):'
}

case ${1:-help} in
  setup) cmd_setup ;;
  voice) cmd_voice ;;
  align) cmd_align ;;
  captions) cmd_captions ;;
  preview) cmd_preview ;;
  check) cmd_check ;;
  sfx) cmd_sfx ;;
  test) shift; cmd_test "$@" ;;
  final) cmd_final ;;
  settings) echo "VOICE=$VOICE SCRIPT=$SCRIPT ENHANCE=$ENHANCE TEMPO=$TEMPO END_HOLD=$END_HOLD WARMTH=$WARMTH LOUDNESS=$LOUDNESS SFX_DB=$SFX_DB MUSIC=$MUSIC MUSIC_DB=$MUSIC_DB" ;;
  *) sed -n '2,13p' "$0" | sed 's/^# \{0,1\}//' ;;
esac
