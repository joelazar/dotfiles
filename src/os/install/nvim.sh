#!/bin/bash

cd "$(dirname "${BASH_SOURCE[0]}")" \
    && . "../utils.sh"

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

install_plugins() {

    declare -r NVIM_PLUG_DIR="$HOME/.local/share/nvim/"
    declare -r VIMPLUG_URL="https://raw.githubusercontent.com/junegunn/vim-plug/master/plug.vim"

    # - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    # Install plugins.

    execute \
        "curl -fLo $NVIM_PLUG_DIR/site/autoload/plug.vim --create-dirs $VIMPLUG_URL \
         && printf '\n' | nvim +PlugInstall +qall" \
        "Install plugins"

}

update_plugins() {

    execute \
        "nvim +PlugUpdate +qall" \
        "Update plugins"

}

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

main() {

    print_in_purple "\n   NeoVim\n\n"

    install_plugins
    update_plugins
    install_package "powerline-fonts" "powerline-fonts"

    printf "\n"

}

main
