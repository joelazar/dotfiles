#!/bin/bash

cd "$(dirname "${BASH_SOURCE[0]}")" \
    && . "../utils.sh" \
    && . "./utils.sh"

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

print_in_purple "\n • Installs\n\n"

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

install_package_manager

update

print_in_purple "\n   Browsers\n\n"
install_package "Firefox" "firefox"

print_in_purple "\n   Development\n\n"

install_package "clang"
install_package "ctags"
install_package "code"
install_package "delve"
install_package "docker"
install_package "fd"
install_package "fzf"
install_package "git"
install_package "go"
install_package "hugo"
install_package "kdiff3"
install_package "neovim"
install_package "jdk-openjdk"
install_package "python"
install_package "ripgrep"
install_package "rust"
install_package "shellcheck"
install_package "shfmt"
install_package "texlive-science"
install_package "texmaker"
install_package "tmux"
install_package "yapf"
install_package "grip"

print_in_purple "\n   Image Tools\n\n"

install_package "gimp"
install_package "imagemagick"

print_in_purple "\n   Miscellaneous\n\n"

install_package "aspell-en"
install_package "bind-tools"
install_package "bleachbit"
install_package "brotli"
install_package "caprine"
install_package "calibre"
install_package "colordiff"
install_package "libqalculate"
install_package "keepassx2"
install_package "mpv"
install_package "moreutils"
install_package "ncdu"
install_package "nnn"
install_package "sxiv"
install_package "tlp"
install_package "tk"
install_package "transmission-cli"
install_package "virtualbox"
install_package "wine"
install_package "xclip"
install_package "youtube-dl"
install_package "zathura"
install_package "zathura-pdf-poppler"

print_in_purple "\n   Fonts\n\n"
install_package "powerline-fonts"

print_in_purple "\n   Penetration testing\n\n"

install_blackarch_repo
install_package "blackarch/aircrack-ng"
install_package "blackarch/bettercap"
install_package "blackarch/dirb"
install_package "blackarch/hydra"
install_package "blackarch/macchanger"
install_package "blackarch/reaver"
install_package "blackarch/whatweb"
install_package "nmap" "nmap"
install_package "wireshark-qt"

print_in_purple "\n   Utilities\n\n"

install_package "alacritty"
install_package "atool"
install_package "bash-completion"
install_package "curl"
install_package "firejail"
install_package "htop"
install_package "neofetch"
install_package "net-tools"
install_package "nethogs"
install_package "rkhunter"
install_package "tcpdump"
install_package "vnstat"
install_package "wireguard-dkms"
install_package "wireguard-tools"

print_in_purple "\n   Sway\n\n"

install_package "bmenu"
install_package "clipit"
install_package "dunst"
install_package "pulseaudio"
install_package "pulseaudio-bluetooth"
install_package "pa-applet"
install_package "sway"
install_package "swayidle"
install_package "swaylock"
install_package "xorg-server-xwayland"

#install_package "rofi" "rofi"
#install_package "sysstat" "sysstat" for what?

print_in_purple "\n   AUR packages\n\n"
install_package "exercism-bin"
install_package "hfsprogs"
install_package "google-chrome"
install_package "joplin"
install_package "restic-git"
install_package "spotify"
install_package "teamviewer"

./nvim.sh
./code.sh

autoremove
clean_up_cache
