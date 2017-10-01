#!/bin/bash

cd "$(dirname "${BASH_SOURCE[0]}")" \
    && . "../../utils.sh" \
    && . "./utils.sh"

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

print_in_purple "\n   Miscellaneous\n\n"

install_package "Midnight commander" "mc"
install_package "Transmission" "transmission"
install_package "VLC" "vlc"
install_package "KeePassX" "keepassx"
install_package "Skype" "skype"

if ! package_is_installed "spotify-client"; then

# TODO - sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys BBEBDCB318AD50EC6865090613B00F1FD2C19886 0DF731E45CE24F27EEEB1450EFDC8610341D9410
    add_key "https://dl-ssl.google.com/linux/linux_signing_key.pub" \
        || print_error "Spotify (add key)"

    add_to_source_list "[arch=amd64] http://repository.spotify.com stable non-free" "spotify.list" \
        || print_error "Spotify (add to package resource list)"

    update &> /dev/null \
        || print_error "Spotify (resync package index files)"

    install_package "Spotify" "spotify-client"
fi

if ! package_is_installed "grive"; then

    add_ppa "ppa:nilarimogard/webupd8" \
        || print_error "grive (add PPA)"

    update &> /dev/null \
        || print_error "grive (resync package index files)"

    install_package "grive" "grive"
fi

if ! package_is_installed "mutate"; then

    add_ppa "ppa:mutate/ppa" \
        || print_error "mutate (add PPA)"

    update &> /dev/null \
        || print_error "mutate (resync package index files)"

    install_package "mutate" "mutate"
fi

# security

install_package "Firejail" "firejail"
# TODO - config