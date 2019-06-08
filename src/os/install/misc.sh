#!/bin/bash

cd "$(dirname "${BASH_SOURCE[0]}")" \
    && . "../utils.sh" \
    && . "./utils.sh"

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

print_in_purple "\n   Miscellaneous\n\n"

# install_package "bing-wallpaper-git" "bing-wallpaper-git" # TODO - not working yet on i3, but I'm on it
install_package "aspell-en" "aspell-en"
install_package "bind-tools" "bind-tools"
install_package "bleachbit" "bleachbit"
install_package "brotli" "brotli"
install_package "calibre" "calibre"
install_package "colordiff" "colordiff"
install_package "freerdp" "freerdp"
install_package "galculator" "galculator"
install_package "keePassX" "keepassx2"
install_package "mpv" "mpv"
install_package "moreutils" "moreutils"
install_package "ncdu" "ncdu"
install_package "otf-font-awesome" "otf-font-awesome"
install_package "ranger" "ranger"
install_package "rdesktop" "rdesktop"
install_package "remmina" "remmina"
install_package "redshift" "redshift"
install_package "sshfs" "sshfs"
install_package "sshpass" "sshpass"
install_package "tlp" "tlp"
install_package "tk" "tk"
install_package "transmission" "transmission-qt"
install_package "virtualbox" "virtualbox"
install_package "wine" "wine"
install_package "xclip" "xclip"
install_package "youtube-dl" "youtube-dl"
install_package "zathura" "zathura"
install_package "zathura-pdf-poppler" "zathura-pdf-poppler"
