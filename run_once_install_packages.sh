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

install_package "chromium"
install_package "firefox"
install_package "qutebrowser"

print_in_purple "Development\n"

install_package "clang"
install_package "ctags"
install_package "docker"
install_package "docker-compose"
install_package "flake8"
install_package "eslint"
install_package "git"
install_package "go"
install_package "helm"
install_package "hugo"
install_package "ipython"
install_package "jdk-openjdk"
install_package "jupyter-notebook"
install_package "jupyterlab"
install_package "kubectl"
install_package "kubectx"
install_package "k9s"
install_package "minikube"
install_package "neovim"
install_package "npm"
install_package "prettier"
install_package "python"
install_package "python-black"
install_package "python-coverage"
install_package "python-isort"
install_package "python-language-server"
install_package "python-pip"
install_package "python-pynvim"
install_package "python-sqlparse"
install_package "python-virtualenv"
install_package "rust"
install_package "shellcheck"
install_package "shfmt"
install_package "texlive-science"
install_package "yarn"

print_in_purple "Image Tools\n"

install_package "inkscape"
install_package "imagemagick"

print_in_purple "Miscellaneous\n"

install_package "acpi"
install_package "aspell-en"
install_package "bat"
install_package "bleachbit"
install_package "brotli"
install_package "calibre"
install_package "colordiff"
install_package "exa"
install_package "github-cli"
install_package "graphviz"
install_package "imv"
install_package "libqalculate"
install_package "moreutils"
install_package "mpv"
install_package "ncdu"
install_package "nnn"
install_package "step-cli"
install_package "tk"
install_package "tlp"
install_package "tokei"
install_package "translate-shell"
install_package "transmission-cli"
install_package "virtualbox"
install_package "youtube-dl"
install_package "zathura"
install_package "zathura-pdf-poppler"

install_nnn_plugins

print_in_purple "Fonts\n"

install_package "noto-fonts-emoji"
install_package "powerline-fonts"
install_package "ttf-font-awesome"
install_package "ttf-hack"
install_package "ttf-nerd-fonts-symbols"

print_in_purple "Penetration testing\n"

install_blackarch_repo
# install_package "aircrack-ng"
# install_package "bettercap"
# install_package "dirb"
# install_package "hydra"
# install_package "macchanger"
# install_package "nmap"
# install_package "reaver"
# install_package "whatweb"
install_package "wireshark-qt"

print_in_purple "Utilities\n"

install_package "atool"
install_package "asciinema"
install_package "bpytop"
install_package "cups"
install_package "curl"
install_package "dog"
install_package "fd"
install_package "firejail"
install_package "fzf"
install_package "htop"
install_package "httpie"
install_package "jq"
install_package "linux-lts"
install_package "lsof"
install_package "neofetch"
install_package "net-tools"
install_package "nm-connection-editor"
install_package "ntfs-3g"
install_package "p7zip"
install_package "rclone"
install_package "ripgrep"
install_package "restic"
install_package "rkhunter"
install_package "strace"
install_package "system-config-printer"
install_package "tcpdump"
install_package "testdisk"
install_package "tmux"
install_package "tree"
install_package "unzip"
install_package "wireguard-dkms"
install_package "wireguard-tools"
install_package "zsh"

install_ohmyzsh

print_in_purple "Sway\n"

install_package "alsa-utils"
install_package "blueman"
install_package "bluez-utils"
install_package "brightnessctl"
install_package "gammastep"
install_package "grim"
install_package "libappindicator-gtk3"
install_package "libnotify"
install_package "libpipewire02"
install_package "mako"
install_package "materia-gtk-theme"
install_package "networkmanager"
install_package "pamixer"
install_package "pavucontrol"
install_package "pipewire"
install_package "pulseaudio"
install_package "pulseaudio-bluetooth"
install_package "qt5-wayland"
install_package "slurp"
install_package "sof-firmware"
install_package "sway"
install_package "swayidle"
install_package "tigervnc"
install_package "waybar"
install_package "wayvnc"
install_package "wl-clipboard"
install_package "xdg-desktop-portal-wlr"
install_package "xorg-server-xwayland"
install_package "wf-recorder"
install_package "wofi"

print_in_purple "GO packages\n"

ask_for_confirmation "Do you want to install GO packages now? It could take a while."
if answer_is_yes; then
  install_go_package "github.com/klauspost/asmfmt/cmd/asmfmt" "asmfmt"
  install_go_package "github.com/go-delve/delve/cmd/dlv" "dlv"
  install_go_package "github.com/kisielk/errcheck" "errcheck"
  install_go_package "github.com/davidrjenni/reftools/cmd/fillstruct" "fillstruct"
  install_go_package "github.com/rogpeppe/godef" "godef"
  install_go_package "golang.org/x/tools/cmd/goimports" "goimports"
  install_go_package "golang.org/x/lint/golint" "golint"
  install_go_package "golang.org/x/tools/gopls" "gopls"
  install_go_package "github.com/golangci/golangci-lint/cmd/golangci-lint" "golangci-lint"
  install_go_package "honnef.co/go/tools/cmd/staticcheck" "staticcheck"
  install_go_package "github.com/fatih/gomodifytags" "gomodifytags"
  install_go_package "golang.org/x/tools/cmd/gorename" "gorename"
  install_go_package "github.com/jstemmer/gotags" "gotags"
  install_go_package "golang.org/x/tools/cmd/guru" "guru"
  install_go_package "github.com/josharian/impl" "impl"
  install_go_package "honnef.co/go/tools/cmd/keyify" "keyify"
  install_go_package "github.com/fatih/motion" "motion"
  install_go_package "github.com/koron/iferr" "iferr"
  install_go_package "github.com/go-swagger/go-swagger" "go-swagger"
  install_go_package "github.com/cosmos72/gomacro" "gomacro"
  install_go_package "github.com/traefik/yaegi/cmd/yaegi" "yaegi"
fi

print_in_purple "JS packages\n"

install_npm_package "bash-language-server"
install_npm_package "javascript-typescript-langserver"
install_yarn_package "@mermaid-js/mermaid-cli" "mermaid-cli"

print_in_purple "Python packages\n"

install_pip_package "subliminal" "subliminal"
install_pip_package "pgcli" "pgcli"

print_in_purple "AUR packages\n"

install_package "ancient-packages"
install_package "azure-cli"
install_package "bat-extras"
install_package "bitwarden-bin"
install_package "bitwarden-cli"
install_package "circleci-cli-bin"
install_package "clipman"
install_package "downgrade"
install_package "dust"
install_package "earbuds"
install_package "exercism-bin"
install_package "foot"
install_package "gitbatch-bin"
install_package "git-delta"
install_package "golang-mockery"
install_package "hfsprogs"
install_package "i3-battery-popup-git"
install_package "joplin"
install_package "kubeval"
install_package "lazydocker"
install_package "lazygit"
install_package "networkmanager-dmenu-git"
install_package "noisetorch-bin"
install_package "postman-bin"
install_package "redoc-cli"
install_package "slack-desktop"
install_package "spotify"
install_package "storageexplorer"
install_package "swappy"
install_package "swaylock-effects-git"
install_package "teamviewer"
install_package "theme.sh"
install_package "wdisplays"
install_package "wlr-randr"
install_package "x11docker"

print_in_purple "SpaceVim\n"

install_spacevim

clean_up_cache
