#!/bin/bash

cd "$(dirname "${BASH_SOURCE[0]}")" \
    && . "../utils.sh" \
    && . "./utils.sh"

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

print_in_purple "\n • Installs\n\n"

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

install_pacaur
update

./browsers.sh
./development.sh
./image_tools.sh
./misc.sh
./misc_tools.sh
./nvim.sh
./python.sh
./ruby.sh

./cleanup.sh
