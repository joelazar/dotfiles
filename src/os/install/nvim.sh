#!/bin/bash

cd "$(dirname "${BASH_SOURCE[0]}")" \
    && . "../utils.sh"

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

install_plugins() {

    declare -r NVIM_CONFIG_DIR="$HOME/.config/nvim"
    declare -r NVIM_DOT_CONFIG="$(cd ../.. && pwd)/nvim"
    declare -r NVIM_PLUG_DIR="$HOME/.local/share/nvim/"
    declare -r VIMPLUG_URL="https://raw.githubusercontent.com/junegunn/vim-plug/master/plug.vim"

    # - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    # Install plugins.

    execute \
        "rm -rf $NVIM_CONFIG_DIR \
            ln -s $NVIM_DOT_CONFIG $NVIM_CONFIG_DIR \ 
         rm -rf '$NVIM_PLUG_DIR' \
            && curl -fLo $NVIM_PLUG_DIR/site/autoload/plug.vim --create-dirs $VIMPLUG_URL \
            && printf '\n' | nvim +PlugInstall" \
        "Install plugins" \
        || return 1

}

update_plugins() {

    execute \
        "vim +PlugUpdate +qall" \
        "Update plugins"

}

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

main() {

    print_in_purple "\n   NeoVim\n\n"

    install_plugins
    update_plugins

    printf "\n"

}

main
