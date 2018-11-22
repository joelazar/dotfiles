#!/bin/bash

cd "$(dirname "${BASH_SOURCE[0]}")" \
    && . "../utils.sh" \
    && . "./utils.sh"

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

main() {
    print_in_purple "\n   I3\n\n"

    install_package "bmenu" "bmenu"
    install_package "clipit" "clipit"
    install_package "dunst" "dunst"
    install_package "feh" "feh"
    install_package "i3-gaps" "i3-gaps"
    install_package "i3-scrot" "i3-scrot"
    install_package "i3blocks" "i3blocks"
    install_package "i3exit" "i3exit"
    install_package "pulseaudio" "pulseaudio"
    install_package "pcmanfm" "pcmanfm"
    install_package "pa-applet" "pa-applet"
    install_package "rofi" "rofi"
    install_package "sysstat" "sysstat"
    install_package "xautolock" "xautolock"
    install_package "xorg-xbacklight" "xorg-xbacklight"
    install_package "xkill" "xorg-xkill"
    install_package "xprop" "xorg-xprop"

}

main
