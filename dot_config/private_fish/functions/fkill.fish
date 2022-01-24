function fkill
    set -l signal 2
    test -z $argv[1]
    or set signal $argv[1]

    set -l uid (id -u)
    set -l pid
    if test $uid -ne 0
        set pid (ps -f -u $uid | sed 1d | fzf -m | awk '{ print $2; }')
    else
        set pid (ps -ef | sed 1d | fzf -m | awk '{ print $2; }')
    end
    echo pid: $pid
    echo signal: $signal

    test -z $pid
    or echo $pid | xargs kill -$signal
end
