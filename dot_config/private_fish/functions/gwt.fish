# `git wt` prints the worktree path; a git subcommand cannot cd the shell, so this wrapper does.
function gwt --description 'Create/open a git worktree and cd into it'
    set -l dest (git wt $argv)
    or return
    if test -d "$dest"
        cd $dest
    else if test -n "$dest"
        printf '%s\n' $dest
    end
end
