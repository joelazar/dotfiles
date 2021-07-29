#!/bin/bash
aecArgs="$*"
# If no "aec_args" are passed on to the script, use this "aec_args" as default:
[ -z "$aecArgs" ] && aecArgs="analog_gain_control=0 digital_gain_control=1"
newSourceName="echoCancelSource"
newSinkName="echoCancelSink"

# "module-switch-on-connect" with "ignore_virtual=no" (needs PulseAudio 12 or higher) is needed to automatically move existing streams to a new (virtual) default source and sink.
if ! pactl list modules short | grep "module-switch-on-connect.*ignore_virtual=no" >/dev/null 2>&1; then
    echo Load module \"module-switch-on-connect\" with \"ignore_virtual=no\"
    pactl unload-module module-switch-on-connect 2>/dev/null
    pactl load-module module-switch-on-connect ignore_virtual=no
fi

# Reload "module-echo-cancel"
echo Reload \"module-echo-cancel\" with \"aec_args=$aecArgs\"
pactl unload-module module-echo-cancel 2>/dev/null
if pactl load-module module-echo-cancel use_master_format=1 aec_method=webrtc aec_args=\"$aecArgs\" source_name=$newSourceName sink_name=$newSinkName; then
    # Set a new default source and sink, if module-echo-cancel has loaded successfully.
    pacmd set-default-source $newSourceName
    pacmd set-default-sink $newSinkName
fi
