#!/bin/bash

cd "$(dirname "${BASH_SOURCE[0]}")" \
    && . "utils.sh"

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

create_symlinks() {
 
     create_symlink   "shell/bash_aliases"
     create_symlink   "shell/bash_autocomplete"
     create_symlink   "shell/bash_exports"
     create_symlink   "shell/bash_functions"
     create_symlink   "shell/bash_logout"
     create_symlink   "shell/bash_options"
     create_symlink   "shell/bash_profile"
     create_symlink   "shell/bash_prompt"
     create_symlink   "shell/bashrc"
     create_symlink   "shell/curlrc"
     create_symlink   "shell/inputrc"
     create_symlink   "git/gitconfig"
     create_symlink   "git/gitignore"
     create_symlink   "tmux/tmux.conf"
     create_symlink   "nvim" "$HOME/.config/nvim"
     mkdir -p $HOME/.config/wireshark/plugins/
     create_symlink   "other/sip_coloring.lua" "$HOME/.config/wireshark/plugins/sip_coloring.lua"

}

create_symlink(){

        local i=""
        local sourceFile=""
        local targetFile=""
        local skipQuestions=false

        # - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

        skip_questions "$@" \
            && skipQuestions=true

        sourceFile="$(cd .. && pwd)/$1"
        if [ -z "$2" ]
        then
                targetFile="$HOME/.$(printf "%s" "$1" | sed "s/.*\/\(.*\)/\1/g")"
        else
                targetFile="$2"
        fi

        if [ ! -e "$targetFile" ] || $skipQuestions; then

            execute \
                "ln -fs $sourceFile $targetFile" \
                "$sourceFile → $targetFile"

        elif [ "$(readlink "$targetFile")" == "$sourceFile" ]; then
            print_success "$sourceFile → $targetFile"
        else

            if ! $skipQuestions; then

                ask_for_confirmation "'$targetFile' already exists, do you want to overwrite it?"
                if answer_is_yes; then

                    rm -rf "$targetFile"

                    execute \
                        "ln -fs $sourceFile $targetFile" \
                        "$sourceFile → $targetFile"

                else
                    print_error "$sourceFile → $targetFile"
                fi

            fi

        fi
}
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

main() {
    print_in_purple "\n • Create symbolic links\n\n"
    create_symlinks "$@"
}

main "$@"
