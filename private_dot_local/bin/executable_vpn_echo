#!/usr/bin/env bash

vpn=$(ls /proc/sys/net/ipv4/conf/ | grep mullvad | cut -d '-' -f2)

if [ "$vpn" != "" ]; then
  echo '{"text":" '"$vpn"'", "class":"connected", "percentage":100}'
else
  echo '{"text":"","class":"disconnected","percentage":0}'
fi
