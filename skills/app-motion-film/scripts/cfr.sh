#!/bin/zsh
# cfr.sh <in> <out.mp4> [start_s] [end_s]: simctl recordings are variable-rate; make them 60 fps constant first.
[ -n "$2" ] || { echo "usage: cfr.sh <in> <out.mp4> [start] [end]"; exit 1; }
VF="fps=60"; [ -n "$3" ] && VF="$VF,trim=start=$3${4:+:end=$4},setpts=PTS-STARTPTS"
ffmpeg -v error -y -i "$1" -vf "$VF" -c:v libx264 -crf 14 -preset fast -pix_fmt yuv420p -r 60 "$2" &&
ffprobe -v error -select_streams v -show_entries stream=width,height,r_frame_rate,avg_frame_rate,nb_frames -of csv=p=0 "$2"
