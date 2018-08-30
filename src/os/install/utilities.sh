#!/bin/bash

cd "$(dirname "${BASH_SOURCE[0]}")" \
    && . "../utils.sh" \
    && . "./utils.sh"

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

print_in_purple "\n   Utilities\n\n"

install_package "bash-completion" "bash-completion"
install_package "curl" "curl"
install_package "firejail" "firejail"
install_package "guake" "guake" # config needed later
install_package "htop" "htop"
install_package "midnight commander" "mc"
install_package "net-tools" "net-tools"
install_package "nethogs" "nethogs"
install_package "tcpdump" "tcpdump"
install_package "vnstat" "vnstat"
install_package "remmina" "remmina"
install_package "freerdp" "freerdp"
