#!/bin/bash

cd "$(dirname "${BASH_SOURCE[0]}")" \
    && . "../utils.sh" \
    && . "./utils.sh"

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

print_in_purple "\n   Browsers\n\n"

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

if ! package_is_installed "google-chrome-stable"; then

    add_key "https://dl-ssl.google.com/linux/linux_signing_key.pub" \
        || print_error "Chrome (add key)"

    add_to_source_list "[arch=amd64] https://dl.google.com/linux/deb/ stable main" "google-chrome.list" \
        || print_error "Chrome (add to package resource list)"

    update &> /dev/null \
        || print_error "Chrome (resync package index files)"

fi

install_package "Chrome" "google-chrome-stable"
install_package "Firefox" "firefox"
install_package "Flash" "flashplugin-installer"
install_package "Thunderbird" "thunderbird"
