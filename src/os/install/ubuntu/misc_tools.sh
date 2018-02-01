#!/bin/bash

cd "$(dirname "${BASH_SOURCE[0]}")" \
    && . "../../utils.sh" \
    && . "./utils.sh"

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

print_in_purple "\n   Miscellaneous Tools\n\n"

install_package "cURL" "curl"
#install_package "ShellCheck" "shellcheck"
install_package "xclip" "xclip"

if ! package_is_installed "fluxgui"; then

    add_ppa "nathan-renniewaldock/flux" \
        || print_error "f.lux (add PPA)"

    update &> /dev/null \
        || print_error "f.lux (resync package index files)"

    install_package "f.lux" "fluxgui"
fi

if ! package_is_installed "caffeine"; then

    add_ppa "ppa:caffeine-developers/ppa" \
        || print_error "caffeine (add PPA)"

    update &> /dev/null \
        || print_error "caffeine (resync package index files)"

    install_package "caffeine" "caffeine"
fi