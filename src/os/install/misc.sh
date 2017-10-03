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

if ! package_is_installed "skype"; then

    add_to_source_list "[arch=amd64] https://repo.skype.com/deb stable main" "skype.list" \
        || print_error "Skype (add to package resource list)"

    update &> /dev/null \
        || print_error "Skype (resync package index files)"

    install_package "Skype" "skypeforlinux"
fi

if ! package_is_installed "spotify-client"; then

    add_to_source_list "[arch=amd64] http://repository.spotify.com stable non-free" "spotify.list" \
        || print_error "Spotify (add to package resource list)"

    update &> /dev/null \
        || print_error "Spotify (resync package index files)"

    install_package "Spotify" "spotify-client"
fi

if ! package_is_installed "grive"; then

    add_ppa "nilarimogard/webupd8" \
        || print_error "grive (add PPA)"

    update &> /dev/null \
        || print_error "grive (resync package index files)"

    install_package "grive" "grive"
fi

install_package "Firejail" "firejail"
# TODO - config
# later - mutate