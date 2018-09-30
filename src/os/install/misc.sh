#!/bin/bash

cd "$(dirname "${BASH_SOURCE[0]}")" \
    && . "../utils.sh" \
    && . "./utils.sh"

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

print_in_purple "\n   Miscellaneous\n\n"

install_package "atool" "atool"
install_package "bing-wallpaper-git" "bing-wallpaper-git"
install_package "bleachbit" "bleachbit"
install_package "brotli" "brotli"
install_package "calibre" "calibre"
install_package "colordiff" "colordiff"
install_package "ctop" "ctop"
install_package "drive" "drive"
install_package "hfsprogs" "hfsprogs"
install_package "keePassX" "keepassx2"
install_package "moreutils" "moreutils" # gem install rdoc was needed...
install_package "ncdu" "ncdu"
install_package "pidgin facebook plugin" "purple-facebook"
install_package "pidgin" "pidgin"
install_package "putty" "putty" # for puttygen ppk keys
install_package "ranger" "ranger"
install_package "rdesktop" "rdesktop"
install_package "redshift" "redshift"
install_package "spotify" "spotify"
install_package "sshfs" "sshfs"
install_package "sshpass" "sshpass"
install_package "teamviewer" "teamviewer"
install_package "tlp" "tlp"
install_package "transmission" "transmission-qt"
install_package "virtualbox" "virtualbox" # not working yet
install_package "vlc" "vlc"
install_package "wine" "wine"
install_package "wunderline" "wunderline" # config needed!
install_package "xclip" "xclip"
install_package "youtube-dl" "youtube-dl"
