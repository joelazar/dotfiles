#!/bin/bash

SOURCE_DIR=$(chezmoi source-path)

. "$SOURCE_DIR/scripts/utils"

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

print_in_purple "System configuration\n"

execute "(getent group docker | grep $USER) || sudo usermod -aG docker $USER" \
  "No sudo required for docker users (logout required!)"

execute "getent group pcap || (sudo groupadd pcap && sudo usermod -aG pcap $USER)" \
  "Create pcap group (logout required!)"

execute "sudo chgrp pcap /usr/sbin/tcpdump && sudo chmod 750 /usr/sbin/tcpdump \
         && sudo setcap cap_net_raw,cap_net_admin=eip /usr/sbin/tcpdump" \
  "No sudo required for tcpdumping"

execute "(getent group vboxusers | grep $USER) || sudo usermod -aG vboxusers $USER" \
  "User added to vboxusers group (logout required!)"

execute "sudo firecfg" "Firejail auto config"

execute "sudo timedatectl set-ntp true" "Turn on ntp"

execute "sudo systemctl enable tlp" "Turn on tlp"

execute "sudo systemctl enable NetworkManager.service" "Turn on networkmanager"

execute "systemctl --user enable pulseaudio" "Pulseaudio started by systemd"

execute "sudo sed -i '/Color$/s/^#//g' /etc/pacman.conf && \
         sudo sed -i '/TotalDownload$/s/^#//g' /etc/pacman.conf && \
         sudo sed -i '/CheckSpace$/s/^#//g' /etc/pacman.conf && \
         sudo sed -i '/VerbosePkgLists$/s/^#//g' /etc/pacman.conf" "Update pacman.conf"

sudo ls /etc/wireguard/ | grep -q mullvad || curl -Ls https://mullvad.net/media/files/mullvad-wg.sh | bash
print_result $? "Setup mullvad"

execute "sudo ln -sf $SOURCE_DIR/other/99-lowbat.rules /etc/udev/rules.d/99-lowbat.rules" "Setup low battery suspend"
