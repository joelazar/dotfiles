#!/usr/bin/env bash

if (ls /proc/sys/net/ipv4/conf/ | grep -q mullvad); then
  echo '{"text":"Connected","class":"connected","percentage":100}'
else
  echo '{"text":"Disconnected","class":"disconnected","percentage":0}'
fi
