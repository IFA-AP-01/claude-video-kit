#!/bin/sh
cd "$(dirname "$0")"
ffmpeg -y -v error -i music/glass_horizon.mp3 -af "atempo=0.967742,atrim=start=1.506:duration=38.0,asetpts=PTS-STARTPTS,afade=t=in:d=0.3,afade=t=out:st=35.0:d=3.0" -ar 48000 -ac 2 music/bed.wav
