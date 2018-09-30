#!/bin/bash

cd "$(dirname "${BASH_SOURCE[0]}")" \
    && . "../utils.sh" \
    && . "./utils.sh"

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

main() {
    print_in_purple "\n   I3\n\n"

    install_package "dunst" "dunst"
    install_package "feh" "feh"
    install_package "i3-gaps" "i3-gaps"
    install_package "i3blocks" "i3blocks"
    install_package "i3lock-fancy-git" "i3lock-fancy-git"
    install_package "parcellite" "parcellite"
    install_package "pa-applet" "pa-applet"
    install_package "rofi" "rofi"
    install_package "sysstat" "sysstat"
    install_package "xautolock" "xautolock"
    install_package "xorg-xbacklight" "xorg-xbacklight"
    install_package "xprop" "xprop"

}

main
