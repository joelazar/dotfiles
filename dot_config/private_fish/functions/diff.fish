#!/usr/bin/env fish

function diff
    /usr/bin/diff -u $argv | delta
end
