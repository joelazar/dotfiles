#!/bin/bash

cd "$(dirname "${BASH_SOURCE[0]}")" \
    && . "../utils.sh" \
    && . "./utils.sh"

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

main() {
    print_in_purple "\n   AUR packages\n\n"

    ask_for_confirmation "Do you want really want to install AUR packages now? Warning, they will be installed with noconfirm flag."

    if answer_is_yes; then
        install_package "caffeine-ng" "caffeine-ng"
        install_package "ctop" "ctop"
        install_package "exercism" "exercism-cli"
        install_package "heroku-cli" "heroku-cli"
        install_package "hfsprogs" "hfsprogs"
        install_package "realvnc-vnc-viewer" "realvnc-vnc-viewer"
        install_package "restic-git" "restic-git"
        install_package "pipdeptree" "pipdeptree"
        install_package "signal" "signal"
        install_package "spotify" "spotify"
        install_package "teamviewer" "teamviewer"
        install_package "widevine plugin for Chromium" "chromium-widevine"
        install_package "wunderline" "wunderline"
    fi

}

main
