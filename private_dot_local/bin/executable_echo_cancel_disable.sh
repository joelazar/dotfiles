#!/bin/bash

echo Unload \"module-echo-cancel\"

pactl unload-module module-echo-cancel 2>/dev/null
