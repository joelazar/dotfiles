#!/bin/bash

cd "$(dirname "${BASH_SOURCE[0]}")" \
    && . "../utils.sh" \
    && . "./utils.sh"

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

print_in_purple "\n   Miscellaneous Tools\n\n"

install_package "bing-wallpaper-git" "bing-wallpaper-git"
install_package "brotli" "brotli"
install_package "cURL" "curl"
install_package "colordiff" "colordiff"
install_package "hfsprogs" "hfsprogs"
install_package "nethogs" "nethogs"
install_package "sshpass" "sshpass"
install_package "vnstat" "vnstat"
install_package "xclip" "xclip"
