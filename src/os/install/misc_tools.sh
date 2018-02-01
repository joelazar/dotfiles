#!/bin/bash

cd "$(dirname "${BASH_SOURCE[0]}")" \
    && . "../utils.sh" \
    && . "./utils.sh"

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

print_in_purple "\n   Miscellaneous Tools\n\n"

install_package "cURL" "curl"
install_package "xclip" "xclip"
install_package "Brotli" "brotli"
install_package "hfsprogs" "hfsprogs"
install_package "colordiff" "colordiff"
install_package "sshpass" "sshpass"
install_package "bing-wallpaper-git" "bing-wallpaper-git"

