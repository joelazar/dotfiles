#!/bin/bash

SOURCE_DIR=$(chezmoi source-path)

. "$SOURCE_DIR/scripts/utils"

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

print_in_purple "System configuration\n"

ask_for_sudo

execute "(getent group docker | grep $USER) || sudo usermod -aG docker $USER" \
	"No sudo required for docker users (logout required!)"

execute "getent group pcap || (sudo groupadd pcap && sudo usermod -aG pcap $USER)" \
	"Create pcap group (logout required!)"

execute "sudo chgrp pcap /usr/sbin/tcpdump && sudo chmod 750 /usr/sbin/tcpdump \
         && sudo setcap cap_net_raw,cap_net_admin=eip /usr/sbin/tcpdump" \
	"No sudo required for tcpdumping"

execute "(getent group vboxusers | grep $USER) || sudo usermod -aG vboxusers $USER" \
	"User added to vboxusers group (logout required!)"

if [ "$SHELL" != "/usr/bin/fish" ]; then
	chsh -s /usr/bin/fish
	print_result $? "Set shell to fish"
fi

execute "if [ ! -d $HOME/.config/nvim ]; then git clone git@github.com:joelazar/nvim-config.git $HOME/.config/nvim; fi;" "Clone neovim config repo"

execute "sudo firecfg" "Firejail auto config"

execute "sudo timedatectl set-ntp true" "Turn on ntp"

execute "sudo systemctl enable NetworkManager.service" "Turn on nm"

execute "sudo systemctl enable NetworkManager-dispatcher.service" "Turn on nm-dispatcher"

execute "sudo systemctl disable NetworkManager-wait-online.service" "Turn off nm-wait-online"

execute "sudo systemctl mask systemd-rfkill.service systemd-rfkill.socket" "Turn off rfkill"

execute "sudo systemctl enable tlp.service" "Turn on tlp"

execute "systemctl --user enable pipewire-pulse" "Turn on pipewire pulseaudio server"

execute "sudo systemctl enable bluetooth.service" "Turn on bluetooth"

execute "sudo systemctl enable docker.service" "Turn on docker"

execute "sudo sed -i '/Color$/s/^#//g' /etc/pacman.conf && \
         sudo sed -i '/TotalDownload$/s/^#//g' /etc/pacman.conf && \
         sudo sed -i '/CheckSpace$/s/^#//g' /etc/pacman.conf && \
         sudo sed -i '/VerbosePkgLists$/s/^#//g' /etc/pacman.conf" "Update pacman.conf"

sudo ls /etc/wireguard/ | grep -q mullvad || (curl -LO https://mullvad.net/media/files/mullvad-wg.sh && chmod +x ./mullvad-wg.sh && ./mullvad-wg.sh && rm ./mullvad-wg.sh)
print_result $? "Setup mullvad"
