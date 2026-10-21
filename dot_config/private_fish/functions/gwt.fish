# Wraps the gwt script so the current shell cds into the worktree.
function gwt --description 'Create/open a git worktree and cd into it'
    set -l dest (command gwt $argv)
    or return
    if test -d "$dest"
        cd $dest
    else if test -n "$dest"
        printf '%s\n' $dest
    end
end
