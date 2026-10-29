#!/bin/zsh
# proxy.sh <track.mp4> <width>: light preview copy (<track>_preview.mp4) for real-time playback in the browser.
[ -n "$2" ] || { echo "usage: proxy.sh <track.mp4> <width>"; exit 1; }
ffmpeg -v error -y -i "$1" -vf "scale=$2:-2:flags=lanczos" -c:v libx264 -profile:v high -bf 0 -g 15 -crf 18 -preset fast \
  -pix_fmt yuv420p -r 60 -movflags +faststart "${1%.mp4}_preview.mp4" && ls -la "${1%.mp4}_preview.mp4"
