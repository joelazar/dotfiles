function fish_title --description 'Terminal/tab title; honours a pinned $TAB_TITLE'
    if set -q TAB_TITLE
        echo $TAB_TITLE
        return
    end

    # Default fish behaviour: running command (if any) plus shortened cwd.
    set -l cmd (status current-command)
    if test "$cmd" = fish
        prompt_pwd
    else
        echo $cmd (prompt_pwd)
    end
end
