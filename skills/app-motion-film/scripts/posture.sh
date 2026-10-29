#!/bin/zsh
# posture.sh Open|Closed: fold or unfold the Duo sim through DeviceHub (simctl cannot).
[ -n "$1" ] || { echo "usage: posture.sh Open|Closed"; exit 1; }
pgrep -x DeviceHub >/dev/null || { open -a /Applications/Xcode.app/Contents/Applications/DeviceHub.app; sleep 3; }
osascript <<OSA
tell application "DeviceHub" to activate
delay 1
tell application "System Events" to tell process "DeviceHub"
  repeat with b in (buttons of group 3 of splitter group 1 of group 1 of splitter group 1 of group 1 of front window)
    try
      if help of b is "$1" then
        perform action "AXPress" of b
        return "pressed $1"
      end if
    end try
  end repeat
  return "not found: $1"
end tell
OSA
