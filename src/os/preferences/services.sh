#!/bin/bash

cd "$(dirname "${BASH_SOURCE[0]}")" \
    && . "../utils.sh"

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

print_in_purple "\n   Services\n\n"

add_service() {
   execute "systemctl --user enable $1 && systemctl --user start $1" "Adding/starting $1 service"
}

execute "sudo timedatectl set-ntp true" "Turn on ntp"

execute "sudo systemctl enable tlp" "Turn on tlp"

#add_service "bing-wallpaper.service"
