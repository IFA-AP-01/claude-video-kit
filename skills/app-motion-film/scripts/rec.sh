#!/bin/zsh
# rec.sh start <out.mov> [inner|outer]  |  rec.sh stop
# Records the booted simulator SIM_UDID. For the Duo set SIM_INNER / SIM_OUTER display IDs (`xcrun simctl io $SIM_UDID enumerate`; they change after a sim reset).
UDID=${SIM_UDID:?set SIM_UDID to the booted simulator UDID}
case $1 in
  start)
    [ -n "$2" ] || { echo "usage: rec.sh start <out.mov> [inner|outer]"; exit 1; }
    D=${SIM_INNER:-}; [ "$3" = outer ] && D=${SIM_OUTER:-}
    xcrun simctl io $UDID recordVideo --codec=h264 ${D:+--display=$D} --force "$2" > /tmp/amf_rec.log 2>&1 &
    echo $! > /tmp/amf_rec.pid; sleep 2; cat /tmp/amf_rec.log ;;
  stop)
    P=$(cat /tmp/amf_rec.pid); kill -INT $P; while kill -0 $P 2>/dev/null; do sleep .3; done; cat /tmp/amf_rec.log ;;
  *) echo "usage: rec.sh start <out.mov> [inner|outer] | stop"; exit 1 ;;
esac
