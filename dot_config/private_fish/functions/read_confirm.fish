#!/usr/bin/env fish

function read_confirm
    set -l prompt 'Do you want to continue? [y/N] '
    test -z $argv[1]
    or set prompt $argv[1]

    while true
        read -l -P $prompt confirm

        switch $confirm
            case Y y
                return 0
            case '' N n
                return 1
        end
    end
end
