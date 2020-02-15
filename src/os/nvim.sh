#!/bin/bash

cd "$(dirname "${BASH_SOURCE[0]}")" \
    && . "../utils.sh" \
    && . "./utils.sh"

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

install_plugins() {

    declare -r NVIM_PLUG_DIR="$HOME/.local/share/nvim/"
    declare -r VIMPLUG_URL="https://raw.githubusercontent.com/junegunn/vim-plug/master/plug.vim"

    # - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    # Install plugins.

    if [ ! -f $NVIM_PLUG_DIR/site/autoload/plug.vim ]; then
        execute "curl -fLo $NVIM_PLUG_DIR/site/autoload/plug.vim --create-dirs $VIMPLUG_URL" "Install vim-plug"
    fi

    execute "nvim +PlugInstall +qall" "Install plugins"

}

update_plugins() {

    execute \
        "nvim +PlugUpgrade +qall" \
        "Upgrade vim-plug"

    execute \
        "nvim +PlugUpdate +qall" \
        "Update plugins"

    execute \
        "nvim +PlugClean! +qall" \
        "Cleanup plugins"

}

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

main() {

    print_in_purple "\n   NeoVim\n\n"

    install_plugins
    update_plugins

    printf "\n"

}

main
