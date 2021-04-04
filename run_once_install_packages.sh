#!/bin/bash

SOURCE_DIR=$(chezmoi source-path)

cd "$SOURCE_DIR" &&
    . "./scripts/utils_install" &&
    . "./scripts/utils"

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

print_in_purple "Install packages\n"

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

ask_for_sudo

install_package_manager

enable_multilib

update

print_in_purple "Browsers\n"

install_package "firefox"
install_package "google-chrome"
install_package "qutebrowser"

print_in_purple "Basics\n"

install_package "bat"
install_package "docker"
install_package "exa"
install_package "fd"
install_package "firejail"
install_package "git"
install_package "htop"
install_package "httpie"
# install_package "neovim"
install_package "neovim-nightly-bin"
install_package "nnn"
install_package "python"
install_package "ripgrep"
install_package "tmux"

print_in_purple "Infrastructure\n"

install_package "azure-cli"
install_package "docker-compose"
install_package "k9s"
install_package "kubectl"
install_package "kubectx"
install_package "kubeseal-bin"
install_package "kubetail"
install_package "kubeval"
install_package "minikube"

print_in_purple "Development\n"

install_package "clang"
install_package "ctags"
install_package "eslint"
install_package "flake8"
install_package "go"
install_package "go-swagger"
install_package "golang-mockery"
install_package "helm"
install_package "hugo"
install_package "ipython"
install_package "jdk-openjdk"
install_package "jupyter-notebook"
install_package "jupyterlab"
install_package "npm"
install_package "pgformatter-git"
install_package "prettier"
install_package "python-black"
install_package "python-coverage"
install_package "python-isort"
install_package "python-language-server"
install_package "python-notedown"
install_package "python-pip"
install_package "python-pynvim"
install_package "rust"
install_package "shellcheck"
install_package "shfmt"
install_package "texlive-latexextra"
install_package "texlive-science"
install_package "yarn"

print_in_purple "Development tools\n"

install_package "code"
install_package "curl"
install_package "direnv"
install_package "git-delta"
install_package "github-cli"
install_package "lazydocker"
install_package "lazygit"
install_package "pgcli"
install_package "postman-bin"

print_in_purple "Communication\n"

install_package "caprine"
install_package "discord"
install_package "signal-desktop"
install_package "slack-desktop"

print_in_purple "Multimedia\n"

install_package "imagemagick"
install_package "imv"
install_package "inkscape"
install_package "mpv"
install_package "spicetify-cli"
install_package "spicetify-themes-git"
install_package "spotify"

print_in_purple "Miscellaneous\n"

install_package "acpi"
install_package "aspell-en"
install_package "bitwarden-bin"
install_package "bitwarden-cli"
install_package "bleachbit"
install_package "brotli"
install_package "calibre"
install_package "graphviz"
install_package "libqalculate"
install_package "moreutils"
install_package "ncdu"
install_package "qrencode"
install_package "step-cli"
install_package "tk"
install_package "tlp"
install_package "throttle"
# sudo systemctl enable --now lenovo_fix.service
install_package "tokei"
install_package "translate-shell"
install_package "transmission-cli"
install_package "virtualbox"
install_package "youtube-dl"
install_package "zathura"
install_package "zathura-pdf-poppler"
install_package "zbar"

install_nnn_plugins

print_in_purple "Fonts\n"

install_package "nerd-fonts-complete"
install_package "ttf-font-awesome"
install_package "ttf-hack"

print_in_purple "Penetration testing\n"

ask_for_confirmation "Do you want to install penetration tools?"
if answer_is_yes; then
    install_blackarch_repo
    install_package "aircrack-ng"
    install_package "bettercap"
    install_package "dirb"
    install_package "hydra"
    install_package "macchanger"
    install_package "nmap"
    install_package "reaver"
    install_package "whatweb"
    install_package "wireshark-qt"
fi

print_in_purple "Shell\n"

install_package "alacritty"
install_package "fish"
install_package "fisher"
install_package "hyperfine"
install_package "starship"
install_package "theme.sh"
install_package "ytfzf-git"

print_in_purple "Fish plugins\n"
install_fish_plugin "evanlucas/fish-kubectl-completions" "kubectl-completions"
install_fish_plugin "jethrokuan/z" "z"
install_fish_plugin "jorgebucaran/fish-bax" "fish-bax"
install_fish_plugin "franciscolourenco/done" "done"
install_fish_plugin "danhper/fish-ssh-agent" "fish-ssh-agent"
install_fish_plugin "PatrickF1/fzf.fish" "fzf.fish"

print_in_purple "Utilities\n"

install_package "asciinema"
install_package "bpytop"
install_package "cups"
install_package "dog"
install_package "downgrade"
install_package "fzf"
install_package "joplin"
install_package "jq"
install_package "lsof"
install_package "neofetch"
install_package "net-tools"
install_package "nm-connection-editor"
install_package "ntfs-3g"
install_package "p7zip"
install_package "rclone"
install_package "restic"
install_package "rkhunter"
install_package "strace"
install_package "system-config-printer"
install_package "tcpdump"
install_package "testdisk"
install_package "tree"
install_package "unzip"
install_package "wireguard-dkms"
install_package "wireguard-tools"

print_in_purple "Linux kernels\n"

install_package "linux-lts"
install_package "linux-lts-headers"
install_package "linux-zen"
install_package "linux-zen-headers"

print_in_purple "Sway\n"

install_package "alsa-utils"
install_package "blueman"
install_package "bluez-utils"
install_package "brightnessctl"
install_package "clipman"
install_package "gammastep"
install_package "grim"
install_package "i3-battery-popup-git"
install_package "libappindicator-gtk3"
install_package "libnotify"
install_package "libpipewire02"
install_package "mako"
install_package "materia-gtk-theme"
install_package "networkmanager"
install_package "networkmanager-dmenu-git"
install_package "pamixer"
install_package "pavucontrol"
install_package "pipewire"
install_package "polkit-kde-agent"
install_package "pulseaudio"
install_package "pulseaudio-modules-bt"
# install_package "pulseaudio-bluetooth" # until pulseaudio 15.0 released?
install_package "qt5-wayland"
install_package "rofi" # temporary
install_package "rofimoji"
install_package "slurp"
install_package "sof-firmware"
install_package "swappy"
install_package "sway"
install_package "swayidle"
install_package "swaylock-effects-git"
install_package "tigervnc"
install_package "waybar"
install_package "wayvnc"
install_package "wdisplays"
install_package "wf-recorder"
install_package "wl-clipboard"
install_package "wlr-randr"
install_package "wofi"
install_package "wtype"
install_package "xdg-desktop-portal-wlr"
install_package "xorg-server-xwayland"

print_in_purple "GO packages\n"

ask_for_confirmation "Do you want to install GO packages now? It could take a while."
if answer_is_yes; then
    install_go_package "github.com/cosmos72/gomacro" "gomacro"
    install_go_package "github.com/traefik/yaegi/cmd/yaegi" "yaegi"
    install_go_package "mvdan.cc/gofumpt" "gofumpt"
fi

print_in_purple "JS packages\n"

ask_for_confirmation "Do you want to install JS packages now? It could take a while."
if answer_is_yes; then
    install_npm_package "bash-language-server"
    install_npm_package "javascript-typescript-langserver"
    install_npm_package "typescript-language-server"
    install_npm_package "vscode-css-languageserver-bin"
    install_npm_package "vscode-html-languageserver-bin"
    install_yarn_package "@mermaid-js/mermaid-cli" "mermaid-cli"
fi

print_in_purple "Python packages\n"

install_pip_package "subliminal" "subliminal"

print_in_purple "Extra packages\n"

install_package "ancient-packages"
install_package "circleci-cli-bin"
install_package "cointop"
install_package "dust"
install_package "earbuds"
install_package "etcher-bin"
install_package "exercism-bin"
install_package "gitbatch-bin"
install_package "hfsprogs"
install_package "noisetorch-bin"
install_package "redoc-cli"
install_package "storageexplorer"
install_package "teamviewer"
install_package "x11docker"

print_in_purple "SpaceVim\n"

install_spacevim

clean_up_cache
