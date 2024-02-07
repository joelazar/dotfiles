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

# TODO: enable rpmfusion repos
# $ sudo dnf install https://mirrors.rpmfusion.org/free/fedora/rpmfusion-free-release-$(rpm -E %fedora).noarch.rpm https://mirrors.rpmfusion.org/nonfree/fedora/rpmfusion-nonfree-release-$(rpm -E %fedora).noarch.rpm

print_in_purple "Browsers\n"

install_package "firefox"
install_package "chromium"

print_in_purple "Basics\n"

install_package "bat"
install_package "docker"
install_package "eza"
install_package "fd-find"
install_package "git"
install_package "git-lfs"
install_package "htop"
install_package "httpie"
install_package "neovim"
install_package "nnn"
install_package "python"
install_package "ripgrep"
install_package "sd"
install_package "zoxide"

print_in_purple "Infrastructure\n"

install_package "docker-compose"
install_package "kubernetes-client"

print_in_purple "Languages\n"

install_package "clang"
install_package "g++"
install_package "go"
install_package "nodejs"
install_package "rust"

# TODO: add mojo
# TODO: add deno

print_in_purple "Package managers\n"

install_package "cargo"
install_package "luarocks"
install_package "npm"
install_package "python-pip"
install_package "python-poetry"
install_package "yarnpkg"

print_in_purple "Interpreters\n"

install_package "ipython"

print_in_purple "Misc\n"

install_package "python3-neovim"
install_package "texlive-latex"

print_in_purple "Development tools\n"

install_package "curl"
install_package "direnv"
install_package "exercism"
install_package "git-delta"
install_package "gh"
install_package "hugo"
install_package "jupyterlab"
install_package "lazygit"
install_package "pgcli"

print_in_purple "Multimedia\n"

install_package "mpv"

print_in_purple "Miscellaneous\n"

install_package "calibre"
install_package "lftp"
install_package "ncdu"
install_package "qalculate"
install_package "qrencode"
install_package "tealdeer"
install_package "tokei"
install_package "translate-shell"
install_package "transmission-cli"

install_nnn_plugins

print_in_purple "Fonts\n"

# TODO: well, this one is not nerd font patched
install_package "fira-code-fonts"

print_in_purple "Shell\n"

install_package "fish"
# TODO: install_package "fisher"
# execute "curl -sL https://raw.githubusercontent.com/jorgebucaran/fisher/main/functions/fisher.fish | source && fisher install jorgebucaran/fisher" "Install fisher"
install_package "kitty"

print_in_purple "Utilities\n"

install_package "age"
install_package "btop"
install_package "duf"
install_package "fastfetch"
install_package "ffmpeg"
install_package "ffmpegthumbnailer"
install_package "fzf"
install_package "jq"
install_package "jc"

# TODO: add mullvad repo
# sudo dnf config-manager --add-repo https://repository.mullvad.net/rpm/stable/mullvad.repo
install_package "mullvad-vpn"
install_package "newsboat"
install_package "rclone"
install_package "restic"
install_package "wget"

# NOTE: not working yet
# install_package "bottles"
# install_package "tailscale"
# install_package "solo2-cli"
# install_package "wine"

# TODO: google-cloud-cli installed with:
# curl -O https://dl.google.com/dl/cloudsdk/channels/rapid/downloads/google-cloud-cli-462.0.1-linux-x86_64.tar.gz

print_in_purple "NPM packages\n"

install_npm_package "gitmoji-cli"
install_npm_package "npm-check"
install_npm_package "yalc"

print_in_purple "Go packages\n"

install_go_package "github.com/cosmos72/gomacro@latest" "gomacro"
install_go_package "github.com/charmbracelet/gum@latest" "gum"
install_go_package "github.com/derailed/k9s@latest" "k9s"

print_in_purple "Rust packages\n"

install_rust_package "atuin"
install_rust_package "fnm"
install_rust_package "starship"
install_rust_package "topgrade"
install_rust_package "watchexec-cli"

print_in_purple "GH plugins\n"

install_gh_plugin "dlvhdr/gh-dash"
install_gh_plugin "github/gh-copilot"

# TODO: install flatpak apps
# install_rust_package "ncspot"
# install_package "obsidian"
