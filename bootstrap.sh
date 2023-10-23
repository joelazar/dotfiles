#!/bin/bash

# This file is only used to initialize the Github codespaces environment.

set -e

# Install requirements

sudo apt update
sudo apt -y install software-properties-common
sudo add-apt-repository -y ppa:neovim-ppa/unstable
sudo apt update

sudo apt install -y ripgrep fd-find neovim git curl golang rust-all luarocks npm python python-pip unzip wget

mkdir -p ~/.config/kitty

git clone https://github.com/joelazar/nvim-config.git ~/.config/nvim
