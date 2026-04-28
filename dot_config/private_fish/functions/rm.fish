function rm --description 'map rm to macOS trash'
    set -l args
    set -l opts 1

    for arg in $argv
        test $opts -eq 1; and test "$arg" = --; and set opts 0; and continue
        test $opts -eq 1; and string match -q -- '-*' "$arg"; and continue
        set -a args $arg
    end

    test (count $args) -gt 0; or begin
        command trash --help
        return 1
    end

    command trash $args
end
