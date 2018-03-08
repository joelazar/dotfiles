#!/bin/bash

cd "$(dirname "${BASH_SOURCE[0]}")" \
    && . "../utils.sh"

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

print_in_purple "\n   Cronjobs\n\n"

add_cronjob() {
   execute "crontab -l | { grep -A1 -vF "$1"; echo -e \"#$1\n$2\"; } | crontab -" "Adding $1 cronjob"
}

add_cronjob "bing-wallpaper" "0 6 * * * ~/bin/bing-wallpaper en-US false"

