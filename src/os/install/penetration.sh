#!/bin/bash

cd "$(dirname "${BASH_SOURCE[0]}")" \
    && . "../utils.sh" \
    && . "./utils.sh"

install_blackarch_repo() {
    if ! pacaur -Sg | grep -q "^blackarch" &> /dev/null; then
        execute "curl -s https://blackarch.org/strap.sh | sudo bash" "install blackarch repo"
    fi
}

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -


print_in_purple "\n   Penetration testing\n\n"

install_blackarch_repo
install_package "aircrack-ng suite" "blackarch/aircrack-ng"
install_package "bettercap" "blackarch/bettercap"
install_package "dirb" "blackarch/dirb"
install_package "hydra" "blackarch/hydra"
install_package "macchanger" "blackarch/macchanger"
install_package "nmap" "nmap"
install_package "reaver" "blackarch/reaver"
install_package "whatweb" "blackarch/whatweb"
install_package "wireshark" "wireshark-qt"
