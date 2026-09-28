#!/usr/bin/env fish

function diff
    command diff -u $argv | diffnav
end
