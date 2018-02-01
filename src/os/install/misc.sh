#!/bin/bash

cd "$(dirname "${BASH_SOURCE[0]}")" \
    && . "../utils.sh" \
    && . "./utils.sh"

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

print_in_purple "\n   Miscellaneous\n\n"

install_package "Midnight commander" "mc"
install_package "Transmission" "transmission"
install_package "VLC" "vlc"
install_package "KeePassX" "keepassx"
install_package "Pidgin" "pidgin"
install_package "htop" "htop"
install_package "wine" "wine-stable"
install_package "youtube-dl" "youtube-dl"
install_package "nmap" "nmap"
install_package "Wireshark" "wireshark-qt"
install_package "Virtualbox" "virtualbox" # not working yet!
install_package "net-tools" "net-tools"
install_package "gconftool" "gconf2"
install_package "sshfs" "sshfs"
install_package "gnome-tweak-tool" "gnome-tweak-tool"
install_package "calibre" "calibre"

if ! package_is_installed "skypeforlinux"; then

    execute "curl https://repo.skype.com/data/SKYPE-GPG-KEY | sudo apt-key add -" "Skype (add key to apt)"

    add_to_source_list "[arch=amd64] https://repo.skype.com/deb stable main" "skype.list" \
        || print_error "Skype (add to package resource list)"

    update &> /dev/null \
        || print_error "Skype (resync package index files)"

fi

install_package "Skype" "skypeforlinux"

if ! package_is_installed "spotify-client"; then

    add_key_by_hash "0DF731E45CE24F27EEEB1450EFDC8610341D9410"

    add_to_source_list "[arch=amd64] http://repository.spotify.com stable non-free" "spotify.list" \
        || print_error "Spotify (add to package resource list)"

    update &> /dev/null \
        || print_error "Spotify (resync package index files)"

fi

install_package "Spotify" "spotify-client"
install_package "Firejail" "firejail"

if ! package_is_installed "tlp"; then

    add_ppa "linrunner/tlp" \
        || print_error "tlp (add PPA)"

    update &> /dev/null \
        || print_error "tlp (resync package index files)"

fi

install_package "tlp" "tlp"
install_package "tlp-rdw" "tlp-rdw"
# install_package "tp-smapi-dkms" "tp-smapi-dkms"   # Thinkpad only
# install_package "acpi-call-dkms" "acpi-call-dkms" # Thinkpad only
# manual config -> /etc/default/tlp

if ! package_is_installed "drive"; then

    add_ppa "twodopeshaggy/drive" \
        || print_error "drive (add PPA)"

    update &> /dev/null \
        || print_error "drive (resync package index files)"

fi

install_package "drive" "drive"
