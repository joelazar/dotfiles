#!/bin/bash

cd "$(dirname "${BASH_SOURCE[0]}")" \
    && . "../utils.sh" \
    && . "./utils.sh"

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

print_in_purple "\n   Miscellaneous Tools\n\n"

install_package "cURL" "curl"
install_package "xclip" "xclip"
install_package "Brotli" "brotli"

if ! package_is_installed "fluxgui"; then

    add_ppa "nathan-renniewaldock/flux" \
        || print_error "f.lux (add PPA)"

    update &> /dev/null \
        || print_error "f.lux (resync package index files)"

    install_package "f.lux" "fluxgui"

fi

install_package "caffeine" "caffeine"
