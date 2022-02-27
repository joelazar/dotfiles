#!/bin/bash
for var in $(rfkill --output SOFT | awk '/^[^ ]/ { print }'); do
    if [[ $var == "unblocked" ]]; then
        if [[ "$1" == "--toggle" ]]; then
            rfkill block all
            pkill -RTMIN+8 waybardd
        else
            echo '{"text":"enabled","tooltip":"","alt":"enabled","class":"enabled"}'
        fi
        exit 0
    fi
done
if [[ "$1" == "--toggle" ]]; then
    rfkill unblock all
    pkill -RTMIN+8 waybardd
else
    echo '{"text":"disabled","tooltip":"","alt":"disabled","class":"disabled"}'
fi
