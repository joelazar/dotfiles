#!/bin/bash

SOURCE_DIR=$(chezmoi source-path)

cd "$SOURCE_DIR" &&
	. "./scripts/utils_install" &&
	. "./scripts/utils"

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

print_in_purple "Install packages\n"

ask_for_confirmation "Would you like to do it now? It can take a bit of time."
if ! answer_is_yes; then
	exit
fi

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

ask_for_sudo

install_package_manager

enable_multilib

install_blackarch_repo

update

print_in_purple "Browsers\n"

install_package "firefox"
install_package "chromium"

print_in_purple "Basics\n"

install_package "bat"
install_package "buku"
install_package "docker"
install_package "docker-buildx"
install_package "exa"
install_package "fd"
install_package "firejail"
install_package "git"
install_package "htop"
install_package "httpie"
install_package "neovim"
install_package "nnn-nerd"
install_package "python"
install_package "ripgrep"
install_package "sd"
install_package "zoxide"

print_in_purple "Infrastructure\n"

install_package "docker-compose"
# install_package "google-cloud-sdk" - until the aur package gets updated
# install_package "google-cloud-sdk-gke-gcloud-auth-plugin" - until the aur package gets updated
install_package "helm"
install_package "k9s"
install_package "kubectl"
install_package "kubectx"
install_package "minikube"

print_in_purple "Languages\n"

install_package "clang"
install_package "deno"
install_package "gcc"
install_package "go"
install_package "nodejs-lts-gallium"
install_package "rust"

print_in_purple "Package managers\n"

install_package "npm"
install_package "python-pip"
install_package "python-poetry"
install_package "yarn"

print_in_purple "Interpreters\n"

install_package "ipython"
install_package "yaegi"

print_in_purple "Misc\n"

install_package "python-coverage"
install_package "python-matplotlib"
install_package "python-numpy"
install_package "python-pandas"
install_package "python-pynvim"
install_package "python-scipy"
install_package "texlive-latexextra"
install_package "texlive-science"

print_in_purple "Development tools\n"

install_package "cht.sh-git"
install_package "curl"
install_package "direnv"
install_package "exercism-bin"
install_package "git-delta"
install_package "gitbatch"
install_package "github-cli"
install_package "hey"
install_package "hugo"
install_package "jupyterlab"
install_package "lazygit"
install_package "mermaid-cli"
install_package "pgcli"
install_package "visual-studio-code-bin"

print_in_purple "Communication\n"

install_package "slack-desktop"

print_in_purple "Multimedia\n"

install_package "gimp"
install_package "imagemagick"
install_package "inkscape"
install_package "mpv"
install_package "ncspot"
install_package "spotify"
install_package "swayimg"
install_package "xournalpp"
install_package "zathura"
install_package "zathura-pdf-poppler"

print_in_purple "Miscellaneous\n"

install_package "acpi"
install_package "acpi_call-dkms"
install_package "aspell-en"
install_package "bitwarden"
install_package "bitwarden-cli"
install_package "bleachbit"
install_package "calibre"
install_package "graphviz"
install_package "lftp"
install_package "libqalculate"
install_package "man-db"
install_package "man-pages"
install_package "moreutils"
install_package "ncdu"
install_package "qrencode"
install_package "sqlite"
install_package "step-cli"
install_package "tealdeer"
install_package "tk"
install_package "tokei"
install_package "translate-shell"
install_package "transmission-cli"
install_package "util-linux"
install_package "virtualbox"
install_package "words"
install_package "yt-dlp"
install_package "zbar"
install_package "zstd"

install_nnn_plugins

print_in_purple "Fonts\n"

install_package "noto-fonts"
install_package "noto-fonts-emoji"
install_package "ttf-roboto-mono"

print_in_purple "Penetration testing\n"

install_package "aircrack-ng"
install_package "bettercap"
install_package "dirb"
install_package "hydra"
install_package "macchanger"
install_package "nmap"
install_package "reaver"
install_package "whatweb"
install_package "wireshark-qt"

print_in_purple "Shell\n"

install_package "fish"
install_package "fisher"
install_package "hyperfine"
install_package "kitty"
install_package "starship"
install_package "theme.sh"

print_in_purple "Fish plugins\n"

update_fish_plugins

print_in_purple "Utilities\n"

install_package "advcpmv"
install_package "age"
install_package "asciinema"
install_package "btop"
install_package "cups"
install_package "dict-gcide"
install_package "dictd"
install_package "dog"
install_package "downgrade"
install_package "duf"
install_package "etcher-bin"
install_package "ffmpeg"
install_package "fzf"
install_package "gnome-keyring"
install_package "gvfs"
install_package "jc"
install_package "jq"
install_package "libreoffice-still"
install_package "lnav"
install_package "lsof"
install_package "neofetch"
install_package "net-tools"
install_package "newsboat"
install_package "nm-connection-editor"
install_package "noisetorch"
install_package "openresolv"
install_package "p7zip"
install_package "paruz"
install_package "pmount"
install_package "rclone"
install_package "restic"
install_package "solo2-cli"
install_package "strace"
install_package "system-config-printer"
install_package "sysz"
install_package "tailscale"
install_package "tcpdump"
install_package "timeshift"
install_package "tlp"
install_package "tlp-rdw"
install_package "unzip"
install_package "visidata"
install_package "w3m"
install_package "wget"
install_package "wireguard-dkms"
install_package "wireguard-tools"
install_package "zenity"
install_package "zk"

print_in_purple "Linux kernels\n"

install_package "linux-lts"
install_package "linux-lts-headers"
install_package "linux-zen"
install_package "linux-zen-headers"

print_in_purple "Drivers\n"

install_package "alsa-utils"
install_package "fprintd"
install_package "fwupd"
install_package "intel-media-driver"
install_package "mesa"
install_package "pipewire"
install_package "sof-firmware"
install_package "v4l2loopback-dkms"
install_package "vulkan-intel"
install_package "vulkan-validation-layers"
install_package "wireplumber"

print_in_purple "Sway\n"

install_package "batsignal"
install_package "blueman"
install_package "bluez-utils"
install_package "brightnessctl"
install_package "clipman"
install_package "dunst"
install_package "gammastep"
install_package "grim"
install_package "kanshi"
install_package "libappindicator-gtk3"
install_package "libnotify"
install_package "materia-gtk-theme"
install_package "networkmanager"
install_package "pavucontrol"
install_package "playerctl"
install_package "polkit-kde-agent"
install_package "pulsemixer"
install_package "qt5-wayland"
install_package "qt6-wayland"
install_package "slurp"
install_package "swappy"
install_package "sway"
install_package "bemenu"
install_package "networkmanager-dmenu-git"
install_package "swayidle"
install_package "swaylock"
install_package "waybar"
install_package "wayvnc"
install_package "wdisplays"
install_package "wf-recorder"
install_package "wl-clipboard"
install_package "wl-mirror"
install_package "wlr-randr"
install_package "xdg-desktop-portal-wlr"
install_package "xorg-xwayland"

print_in_purple "GO packages\n"

install_go_package "github.com/cosmos72/gomacro@latest" "gomacro" # aur - outdated

print_in_purple "NPM packages\n"

# hey, let's make js useable
install_npm_package "typescript"
# and get a proper REPL for it
install_npm_package "ts-node"
# check for outdated packages
install_npm_package "npm-check"
# slidev - markdown based presentations with a lot of feature, but still in beta
install_npm_package "@slidev/cli"
# gitmoji-cli - gitmoji interactive client for using gitmojis on commit messages
install_npm_package "gitmoji-cli"
# github copilot - AI code completion for shell commands
install_npm_package "@githubnext/github-copilot-cli"

print_in_purple "GH plugins\n"

install_gh_plugin "dlvhdr/gh-dash"

clean_up_cache
