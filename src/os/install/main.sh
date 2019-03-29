#!/bin/bash

cd "$(dirname "${BASH_SOURCE[0]}")" \
    && . "../utils.sh" \
    && . "./utils.sh"

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

print_in_purple "\n • Installs\n\n"

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

install_package_manager

update

./browsers.sh
./development.sh
./image_tools.sh
./misc.sh
./nvim.sh
./penetration.sh
./utilities.sh
./i3.sh
./aur.sh

./cleanup.sh
