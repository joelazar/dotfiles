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

execute "(getent group docker | grep $USER) || sudo usermod -aG docker $USER" \
	"No sudo required for docker users (logout required!)"

if [ "$SHELL" != "/usr/bin/fish" ]; then
	chsh -s /usr/bin/fish
	print_result $? "Set shell to fish"
fi

execute "if [ ! -d $HOME/.config/nvim ]; then git clone git@github.com:joelazar/nvim-config.git $HOME/.config/nvim; fi;" "Clone neovim config repo"

execute "fish -c 'fish_config theme save \"Catppuccin Mocha\"'" "Set fish theme"

# TODO: turn off boot sound
# sudo asahi-nvram write system:StartupMute=%01
