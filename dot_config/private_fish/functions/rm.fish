function rm --description 'map rm to gio trash'
    if string match -q -- '-*' $argv[1]
        set argv[1] (string replace -a 'r' '' -- $argv[1])
    end
    gio trash $argv
end
