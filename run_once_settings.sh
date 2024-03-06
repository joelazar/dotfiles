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

# TODO: do not set theme if it was already set
execute "fish -c 'fish_config theme save \"Catppuccin Mocha\"'" "Set fish theme"

execute "defaults write NSGlobalDomain ApplePressAndHoldEnabled -bool false" "Disable tooltip when holding key"

execute "defaults write NSGlobalDomain KeyRepeat -float 1.0" "Set a blazingly fast keyboard repeat rate"

execute "defaults write NSGlobalDomain InitialKeyRepeat -int 12" "Set a shorter Delay until key repeat"

execute "sudo nvram SystemAudioVolume=\" \"" "Disable the sound effects on boot"

execute "defaults write NSGlobalDomain AppleShowAllExtensions -bool true" "Show all filename extensions"

execute "defaults write com.apple.dock autohide -bool true" "Automatically hide and show the Dock"

execute "defaults write com.apple.dock autohide-delay -float 0" "Remove the auto-hiding Dock delay"

execute "defaults write com.apple.dock autohide-time-modifier -float 0" "Remove the animation when hiding/showing the Dock"

# swap ctrl and function keys
# execute "hidutil property --set '{\"UserKeyMapping\":[{\"HIDKeyboardModifierMappingSrc\":0x7000000E0,\"HIDKeyboardModifierMappingDst\":0x7000000E1},{\"HIDKeyboardModifierMappingSrc\":0x7000000E1,\"HIDKeyboardModifierMappingDst\":0x7000000E0}]}'" "Swap ctrl and function keys"

# map caps lock to escape
# execute "hidutil property --set '{\"UserKeyMapping\":[{\"HIDKeyboardModifierMappingSrc\":0x700000039,\"HIDKeyboardModifierMappingDst\":0x700000029}]}'" "Map caps lock to escape"
