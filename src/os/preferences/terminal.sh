#!/bin/bash

cd "$(dirname "${BASH_SOURCE[0]}")" \
    && . "../utils.sh"

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

print_in_purple "\n   Terminal\n\n"

execute "cd $HOME/Downloads/ && wget -O xt http://git.io/v3DBF && chmod +x xt && ./xt && rm xt" \
    "Set custom terminal theme - Tin"

# https://github.com/Mayccoll/Gogh