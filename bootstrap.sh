#!/bin/bash

set -e

# This file is only used to initialize the Github codespaces environment.

# Install packages from official repos
sudo apt install -y ripgrep fd-find git curl python3 python3-pip unzip wget luarocks fzf htop nnn

# Install ppa's
sudo add-apt-repository -y ppa:longsleep/golang-backports
sudo add-apt-repository -y ppa:neovim-ppa/unstable

sudo apt update

# Install packages from ppa's
# TODO: add go to PATH
sudo apt install -y neovim golang-go

# Install Rust
# TODO: automatic install
curl --proto '=https' --tlsv1.3 https://sh.rustup.rs -sSf | sh

# Install FNM
curl -fsSL https://fnm.vercel.app/install | bash

export PATH="/home/codespace/.local/share/fnm:$PATH"

fnm install 20

# TODO: add to path + source from fish
# fnm env --use-on-cd | source

# Install lazygit
# TODO: add lazygit config
LAZYGIT_VERSION=$(curl -s "https://api.github.com/repos/jesseduffield/lazygit/releases/latest" | grep -Po '"tag_name": "v\K[^"]*')
curl -Lo lazygit.tar.gz "https://github.com/jesseduffield/lazygit/releases/latest/download/lazygit_${LAZYGIT_VERSION}_Linux_x86_64.tar.gz"
tar xf lazygit.tar.gz lazygit
sudo install lazygit /usr/local/bin

curl -s https://deb.nodesource.com/gpgkey/nodesource.gpg.key | apt-key add -

# Add bits needed for GitHub CLI
# TODO: add gh config
type -p curl >/dev/null || (sudo apt update && sudo apt install curl -y)
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg &&
	sudo chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg &&
	echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list >/dev/null &&
	sudo apt update &&
	sudo apt install gh -y

mkdir -p ~/.config/kitty

# Set fish as default shell
sudo chsh -s /usr/bin/fish

git clone https://github.com/joelazar/nvim-config.git ~/.config/nvim

# TODO: setup neovim automatically
