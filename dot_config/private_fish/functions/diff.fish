#!/usr/bin/env fish

function diff
    nvim $argv[1] $argv[2] +"CodeDiff file $argv[1] $argv[2]"
end
