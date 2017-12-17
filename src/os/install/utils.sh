#!/bin/bash

cd "$(dirname "${BASH_SOURCE[0]}")" \
    && . "../utils.sh"

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

pacaur() {
    sudo pacman -Sq --needed --noconfirm pacaur &> /dev/null
    print_success "PACAUR"
}

autoremove() {
    sudo pacaur -Qtd --noconfirm
    print_success "PACAUR (autoremove)"
}

install_package() {
    declare -r PACKAGE="$2"
    declare -r PACKAGE_READABLE_NAME="$1"

    if ! package_is_installed "$PACKAGE"; then
        execute "pacaur -S --noedit --noconfirm --needed $PACKAGE" "$PACKAGE_READABLE_NAME"
    else
        print_success "$PACKAGE_READABLE_NAME"
    fi
}

package_is_installed() {
    pacaur -Q | grep -q "^$1 " &> /dev/null
}

update() {
    execute \
        "pacaur -Syyu" \
        "PACAUR (update)"
}

