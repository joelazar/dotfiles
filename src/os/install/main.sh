#!/bin/bash

cd "$(dirname "${BASH_SOURCE[0]}")" \
    && . "../utils.sh" \
    && . "./utils.sh"

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

print_in_purple "\n • Installs\n\n"

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

update

./browsers.sh
./development.sh
./image_tools.sh
./misc.sh
./nvim.sh
./penetration.sh
./python.sh
./ruby.sh
./utilities.sh
./i3.sh

./cleanup.sh
