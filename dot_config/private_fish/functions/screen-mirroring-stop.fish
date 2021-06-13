#!/usr/bin/env fish

function screen-mirroring-stop
    pkill wayvnc
    pkill vncviewer
end
