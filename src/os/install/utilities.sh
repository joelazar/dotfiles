#!/bin/bash

cd "$(dirname "${BASH_SOURCE[0]}")" \
    && . "../utils.sh" \
    && . "./utils.sh"

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

print_in_purple "\n   Utilities\n\n"

install_package "bash-completion" "bash-completion"
install_package "curl" "curl"
install_package "firejail" "firejail"
install_package "htop" "htop"
install_package "net-tools" "net-tools"
install_package "nethogs" "nethogs"
install_package "termite" "termite"
install_package "tcpdump" "tcpdump"
install_package "vnstat" "vnstat"
