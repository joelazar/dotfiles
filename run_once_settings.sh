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

# NOTE: settings based on https://mac-key-repeat.zaymon.dev/
execute "defaults write NSGlobalDomain KeyRepeat -int 1" "Keyboard: Set 15 ms key repeat"

execute "defaults write NSGlobalDomain InitialKeyRepeat -int 13" "Keyboard: Set 195 ms initial delay"

execute "defaults write NSGlobalDomain ApplePressAndHoldEnabled -bool false" "Keyboard: Disable tooltip when holding key"

execute 'sudo nvram SystemAudioVolume=" "' "Disable the sound effects on boot"

execute "defaults write NSGlobalDomain AppleShowAllExtensions -bool true" "Show all filename extensions"

execute "defaults write com.apple.dock autohide -bool true" "Automatically hide and show the Dock"

execute "defaults write com.apple.dock autohide-delay -float 0" "Remove the auto-hiding Dock delay"

execute "defaults write com.apple.dock autohide-time-modifier -float 0" "Remove the animation when hiding/showing the Dock"

execute "sudo spctl --master-disable" "Allow apps downloaded from anywhere"

execute "defaults write com.apple.LaunchServices LSQuarantine -bool false" "Disable the 'Are you sure you want to open this application?' dialog"

# TODO:
# swap ctrl and function keys
# execute "hidutil property --set '{\"UserKeyMapping\":[{\"HIDKeyboardModifierMappingSrc\":0x7000000E0,\"HIDKeyboardModifierMappingDst\":0x7000000E1},{\"HIDKeyboardModifierMappingSrc\":0x7000000E1,\"HIDKeyboardModifierMappingDst\":0x7000000E0}]}'" "Swap ctrl and function keys"

# TODO:
# map caps lock to escape
# execute "hidutil property --set '{\"UserKeyMapping\":[{\"HIDKeyboardModifierMappingSrc\":0x700000039,\"HIDKeyboardModifierMappingDst\":0x700000029}]}'" "Map caps lock to escape"

# TODO:
# use f1, f2, etc. as standard function keys by default

# TODO:
# do not change input source for ctrl+space

# TODO:
# turn off spotlight keyboard shortcuts, raycast will use that instead

# TODO:
# hide menu bar automatically

# TODO:
# double clicking on title bar should zoom

# TODO:
# setup night shift

# TODO:
# set hostname
# sudo scutil --set HostName <new host name>
# sudo scutil --set LocalHostName <new host name>
# sudo scutil --set ComputerName <new name>
# dscacheutil -flushcache
# reboot

# TODO:
# disable wakeup on bluetooth
# https://apple.stackexchange.com/questions/431812/how-can-i-stop-a-bluetooth-keyboard-from-waking-my-macbook-pro/437396#437396
# brew install sleepwatcher blueutil
# echo "$(which blueutil) -p 0" > ~/.sleep
# echo "$(which blueutil) -p 1" > ~/.wakeup
# chmod 755 ~/.sleep ~/.wakeup
# brew services restart sleepwatcher

# TODO:
# yabai prerequisite setup
# csrutil enable --without fs --without debug --without nvram
# sudo nvram boot-args=-arm64e_preview_abi
# echo "$(whoami) ALL=(root) NOPASSWD: sha256:$(shasum -a 256 $(which yabai) | cut -d " " -f 1) $(which yabai) --load-sa" | sudo tee /private/etc/sudoers.d/yabai

# TODO:
# yabai --install-service
# skhd --install-service
# brew services start sketchybar
