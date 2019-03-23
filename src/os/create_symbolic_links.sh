#!/bin/bash

cd "$(dirname "${BASH_SOURCE[0]}")" \
    && . "utils.sh"

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

create_symlinks() {

     create_symlink   "alacritty/alacritty.yml" "$HOME/.config/alacritty/alacritty.yml"
     create_symlink   "development/clang-format"
     create_symlink   "git/gitconfig"
     create_symlink   "git/gitignore"
     create_symlink   "i3/config" "$HOME/.config/i3/config"
     create_symlink   "i3/i3-scrot.conf" "$HOME/.config/i3-scrot.conf"
     create_symlink   "i3/i3blocks.conf" "$HOME/.config/i3/i3blocks.conf"
     create_symlink   "nvim" "$HOME/.config/nvim"
     create_symlink   "ranger/commands.py" "$HOME/.config/ranger/commands.py"
     create_symlink   "scripts/backup" "$HOME/bin/backup"
     create_symlink   "scripts/untilfail" "$HOME/bin/untilfail"
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
     create_symlink   "thinkpad/20-intel.conf" "/etc/X11/xorg.conf.d/20-intel.conf" "sudo-needed"
     create_symlink   "thinkpad/30-touchpad.conf" "/etc/X11/xorg.conf.d/30-touchpad.conf" "sudo-needed"
     create_symlink   "tmux/tmux.conf"
#     create_symlink   "other/compton.conf" "$HOME/.config/compton.conf"
#     create_symlink   "services/bing-wallpaper.service" "$HOME/.config/systemd/user/bing-wallpaper.service" # TODO - fix bing-wallpaper for i3
}

create_symlink(){

        local i=""
        local sourceFile=""
        local targetFile=""
        local skipQuestions=false
        local sudo=""

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

        if [ -n "$3" ] && [[ "$3" == "sudo-needed" ]]; then
                ask_for_sudo
                sudo="sudo"
        fi

        if [ ! -e "$targetFile" ] || $skipQuestions; then

            execute \
                "$sudo ln -fs $sourceFile $targetFile" \
                "$sourceFile → $targetFile"

        elif [ "$(readlink "$targetFile")" == "$sourceFile" ]; then
            print_success "$sourceFile → $targetFile"
        else

            if ! $skipQuestions; then

                ask_for_confirmation "'$targetFile' already exists, do you want to overwrite it?"
                if answer_is_yes; then

                    $sudo rm -rf "$targetFile"

                    execute \
                        "$sudo ln -fs $sourceFile $targetFile" \
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
