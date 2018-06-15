#!/bin/bash

cd "$(dirname "${BASH_SOURCE[0]}")" \
    && . "../utils.sh" \
    && . "./utils.sh"

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

print_in_purple "\n   Miscellaneous\n\n"

install_package "bash-completion" "bash-completion"
install_package "calibre" "calibre"
install_package "drive" "drive"
install_package "firejail" "firejail"
install_package "guake" "guake" # config needed later
install_package "htop" "htop"
install_package "keePassX" "keepassx2"
install_package "midnight commander" "mc"
install_package "moreutils" "moreutils" # gem install rdoc was needed...
install_package "net-tools" "net-tools"
install_package "pidgin facebook plugin" "purple-facebook"
install_package "pidgin" "pidgin"
install_package "rdesktop" "rdesktop"
install_package "redshift" "redshift"
install_package "spotify" "spotify"
install_package "sshfs" "sshfs"
install_package "tcpdump" "tcpdump"
install_package "teamviewer" "teamviewer"
install_package "tlp" "tlp"
install_package "transmission" "transmission-qt"
install_package "virtualbox" "virtualbox" # not working yet
install_package "vlc" "vlc"
install_package "wine" "wine"
install_package "wunderline" "wunderline" # config needed!
install_package "youtube-dl" "youtube-dl"
