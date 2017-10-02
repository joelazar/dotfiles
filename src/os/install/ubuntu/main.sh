#!/bin/bash

cd "$(dirname "${BASH_SOURCE[0]}")" \
    && . "../../utils.sh" \
    && . "utils.sh"

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

update
upgrade

./build-essentials.sh

./browsers.sh
./compression_tools.sh
./development.sh
./image_tools.sh
./misc.sh
./misc_tools.sh
./../python.sh
./tmux.sh
./../vim.sh

./cleanup.sh
