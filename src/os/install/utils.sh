#!/bin/bash

cd "$(dirname "${BASH_SOURCE[0]}")" \
    && . "../utils.sh"

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

declare -r INSTALLED_PACKAGES=`yaourt -Q`

autoremove() {
    execute "sudo yaourt -Qtd --noconfirm || true" "YAOURT (autoremove)"
}

install_package() {
    declare -r PACKAGE="$2"
    declare -r PACKAGE_READABLE_NAME="$1"

    if ! package_is_installed "$PACKAGE"; then
        execute "yaourt -S --noconfirm --needed $PACKAGE" "$PACKAGE_READABLE_NAME"
    else
        print_success "$PACKAGE_READABLE_NAME"
    fi
}

package_is_installed() {
    echo $INSTALLED_PACKAGES | grep -q "$1 " &> /dev/null
}

update() {
    execute "yaourt -Syyu --noconfirm" "YAOURT (update)"
}

