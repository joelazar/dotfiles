#!/bin/bash

cd "$(dirname "${BASH_SOURCE[0]}")" \
    && . "../utils.sh"

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

print_in_purple "\n   Development configuration\n\n"

execute "sudo systemctl enable docker" "Autostart docker"

execute "getent group docker || (sudo groupadd docker && sudo usermod -aG docker $USER)" \
        "No sudo required for docker (logout required!)"

execute "getent group pcap || (sudo groupadd pcap && sudo usermod -aG pcap $USER \
         && sudo chgrp pcap /usr/sbin/tcpdump && sudo chmod 750 /usr/sbin/tcpdump \
         && sudo setcap cap_net_raw,cap_net_admin=eip /usr/sbin/tcpdump)" \
        "No sudo required for tcpdumping (logout required!)"

execute "gsettings set com.canonical.Unity.Lenses remote-content-search 'none'" \
        "Turn off 'Remote Search' so that search terms in Dash do not get sent over the internet"
