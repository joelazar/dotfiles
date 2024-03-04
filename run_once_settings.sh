#!/bin/bash

SOURCE_DIR=$(chezmoi source-path)

. "$SOURCE_DIR/scripts/utils"

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

print_in_purple "System configuration\n"

ask_for_confirmation "Would you like to do it now?"
if ! answer_is_yes; then
	exit
fi

ask_for_sudo

if [ "$SHELL" != "/opt/homebrew/bin/fish" ]; then
	sudo sh -c 'echo /opt/homebrew/bin/fish >> /etc/shells'
	chsh -s /opt/homebrew/bin/fish
	print_result $? "Set shell to fish"
fi

execute "if [ ! -d $HOME/.config/nvim ]; then git clone git@github.com:joelazar/nvim-config.git $HOME/.config/nvim; fi;" "Clone neovim config repo"

execute "fish -c 'fish_config theme save \"Catppuccin Mocha\"'" "Set fish theme"

# TODO: turn off boot sound
# sudo asahi-nvram write system:StartupMute=%01

# TODO: set obsidian to use wayland
# flatpak override --user --socket=wayland md.obsidian.Obsidian

# TODO: set armcord to use wayland
# flatpak override --user --socket=wayland xyz.armcord.ArmCord

# TODO: swap ctrl and function keys
# echo "options hid_apple swap_fn_leftctrl=1" > /etc/modprobe.d/keyboard.conf
# regenerate initramfs
# sudo dracut --regenerate-all --force
