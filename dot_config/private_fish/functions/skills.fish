function skills --description 'skills CLI with invocation-policy enforcement after updates'
    command skills $argv
    set -l status_saved $status
    switch "$argv[1]"
        case update upgrade add
            skills-invocation
    end
    return $status_saved
end
