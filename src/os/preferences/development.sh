#!/bin/bash

cd "$(dirname "${BASH_SOURCE[0]}")" \
    && . "../utils.sh"

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

print_in_purple "\n   Development configuration\n\n"

execute "sudo systemctl enable docker" "Autostart docker"

execute "getent group docker || (sudo groupadd docker && sudo usermod -aG docker $USER)" \
        "Docker group created. No sudo required for docker users (logout required!)"

execute "getent group pcap || (sudo groupadd pcap && sudo usermod -aG pcap $USER)" \
        "Create pcap group (logout required!)"

execute "sudo chgrp pcap /usr/sbin/tcpdump && sudo chmod 750 /usr/sbin/tcpdump \
         && sudo setcap cap_net_raw,cap_net_admin=eip /usr/sbin/tcpdump" \
        "No sudo required for tcpdumping"

execute "getent group vboxusers | grep $USER || echo joe && sudo usermod -aG vboxusers $USER" \
        "User added to vboxusers group (logout required!)"

execute "if [ ! -e ~/.config/exercism/exercism_completion.bash ]; then mkdir -p ~/.config/exercism/ \
         && curl https://raw.githubusercontent.com/exercism/cli/v3.0.11/shell/exercism_completion.bash > ~/.config/exercism/exercism_completion.bash; fi" \
         "Exercism bash completions"
