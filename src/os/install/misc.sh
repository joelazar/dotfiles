#!/bin/bash

cd "$(dirname "${BASH_SOURCE[0]}")" \
    && . "../utils.sh" \
    && . "./utils.sh"

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

print_in_purple "\n   Miscellaneous\n\n"

install_package "Midnight commander" "mc"
install_package "Transmission" "transmission-qt"
install_package "VLC" "vlc"
install_package "KeePassX" "keepassx"
install_package "Pidgin" "pidgin"
install_package "htop" "htop"
install_package "wine" "wine"
install_package "youtube-dl" "youtube-dl"
install_package "nmap" "nmap"
install_package "tcpdump" "tcpdump"
install_package "Wireshark" "wireshark-qt"
install_package "Virtualbox" "virtualbox" # not working yet
install_package "net-tools" "net-tools"
install_package "sshfs" "sshfs"
install_package "calibre" "calibre"
install_package "Skype" "skypeforlinux-bin"
install_package "Spotify" "spotify"
install_package "Firejail" "firejail"
install_package "tlp" "tlp"
install_package "tlp-rdw" "tlp-rdw"
install_package "tp_smapi-dkms" "tp_smapi-dkms"   # Thinkpad only
install_package "acpi_call" "acpi_call" # Thinkpad only
# manual config -> /etc/default/tlp
install_package "drive" "drive"
