#!/bin/bash

cd "$(dirname "${BASH_SOURCE[0]}")" \
    && . "utils.sh"

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

create_directories() {

    declare -a DIRECTORIES=(
        "$HOME/bin"
        "$HOME/git"
        "$HOME/go"
        "$HOME/logs"
        "$HOME/notes"
        "$HOME/private"
        "$HOME/.config/sway"
        "$HOME/.config/mpv/scripts"
        "$HOME/.config/Code\ -\ OSS/User/"
        "$HOME/pictures/screenshots"
    )

    for i in "${DIRECTORIES[@]}"; do
        mkd "$i"
    done

}

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

main() {
    print_in_purple "\n • Create directories\n\n"
    create_directories
}

main
