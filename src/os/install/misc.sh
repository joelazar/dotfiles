#!/bin/bash

cd "$(dirname "${BASH_SOURCE[0]}")" \
    && . "../utils.sh" \
    && . "./utils.sh"

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

print_in_purple "\n   Miscellaneous\n\n"

# install_package "bing-wallpaper-git" "bing-wallpaper-git" # TODO - not working yet on i3, but I'm on it
install_package "aspell-en" "aspell-en"
install_package "bleachbit" "bleachbit"
install_package "brotli" "brotli"
install_package "calibre" "calibre"
install_package "colordiff" "colordiff"
install_package "freerdp" "freerdp"
install_package "galculator" "galculator"
install_package "keePassX" "keepassx2"
install_package "moreutils" "moreutils" # gem install rdoc was needed...
install_package "ncdu" "ncdu"
install_package "pidgin" "pidgin"
install_package "putty" "putty" # for puttygen ppk keys
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
install_package "virtualbox" "virtualbox" # not working yet
install_package "vlc" "vlc"
install_package "wine" "wine"
install_package "xclip" "xclip"
install_package "youtube-dl" "youtube-dl"
