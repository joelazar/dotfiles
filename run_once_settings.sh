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

execute "fish -c 'echo y | fish_config theme save TokyoNight Night'" "Set fish theme"

# settings based on https://mac-key-repeat.zaymon.dev/
execute "defaults write NSGlobalDomain KeyRepeat -int 1" "Keyboard: Set 15 ms key repeat"

execute "defaults write NSGlobalDomain InitialKeyRepeat -int 13" "Keyboard: Set 195 ms initial delay"

execute "defaults write NSGlobalDomain ApplePressAndHoldEnabled -bool false" "Keyboard: Disable tooltip when holding key"

execute 'sudo nvram SystemAudioVolume=" "' "Disable the sound effects on boot"

execute "defaults write NSGlobalDomain AppleShowAllExtensions -bool true" "Show all filename extensions"

execute "defaults write com.apple.dock autohide -bool true" "Automatically hide and show the Dock"

execute "defaults write com.apple.dock autohide-delay -float 0" "Remove the auto-hiding Dock delay"

execute "defaults write com.apple.dock autohide-time-modifier -float 0" "Remove the animation when hiding/showing the Dock"

execute "defaults write com.apple.LaunchServices LSQuarantine -bool false" "Disable the 'Are you sure you want to open this application?' dialog"

execute 'defaults write com.apple.symbolichotkeys AppleSymbolicHotKeys -dict-add 64 "{enabled = 0; value = {};}"' "Disable Spotlight keyboard shortcut for Show Spotlight search"

execute 'defaults write com.apple.symbolichotkeys AppleSymbolicHotKeys -dict-add 65 "{enabled = 0; value = {};}"' "Disable Spotlight keyboard shortcut for Finder search window"

execute 'defaults write NSGlobalDomain AppleActionOnDoubleClick -string "Maximize"' "Double-click a window's title bar to minimize"

execute "defaults write com.apple.screencapture location ~/Pictures/screenshots/" "Save screenshots to the Pictures/screenshots directory"

execute "duti -s dev.zed.Zed-Preview public.plain-text all" "Set Zed as the default app for plain text files"

execute "duti -s dev.zed.Zed-Preview public.comma-separated-values-text all" "Set Zed as the default app for CSV files"

execute "duti -s dev.zed.Zed-Preview public.data all" "Set Zed as the default app for data files"

if [ -f ~/.docker/cli-plugins/docker-buildx ]; then
    print_success "Docker buildx configured"
else
    mkdir -p ~/.docker/cli-plugins
    ln -sf /opt/homebrew/opt/docker-buildx/bin/docker-buildx ~/.docker/cli-plugins/docker-buildx
    print_result $? "Docker buildx configured"
fi

# Enable Touch ID for sudo
if [ -f /etc/pam.d/sudo_local ]; then
    # Check if Touch ID is already enabled
    if grep -q "pam_tid.so" /etc/pam.d/sudo_local; then
        print_success "Touch ID for sudo already enabled"
    else
        echo "auth       sufficient     pam_tid.so" | sudo tee -a /etc/pam.d/sudo_local
        print_result $? "Enable Touch ID for sudo"
    fi
elif [ -f /etc/pam.d/sudo_local.template ]; then
    # If template exists, copy it and add the Touch ID configuration
    sudo cp /etc/pam.d/sudo_local.template /etc/pam.d/sudo_local
    echo "auth       sufficient     pam_tid.so" | sudo tee -a /etc/pam.d/sudo_local
    print_result $? "Enable Touch ID for sudo (from template)"
else
    # Create new file
    echo "auth       sufficient     pam_tid.so" | sudo tee /etc/pam.d/sudo_local
    print_result $? "Enable Touch ID for sudo (new file)"
fi

# Update hostname
ask_for_confirmation "Would you like to set a new hostname?"
if answer_is_yes; then
    ask "Enter new hostname:"
    hostname=$REPLY
    execute "sudo scutil --set ComputerName $hostname" "Set computer name to $hostname"
    execute "sudo scutil --set HostName $hostname" "Set host name to $hostname"
    execute "sudo scutil --set LocalHostName $hostname" "Set local host name to $hostname"
    execute "sudo defaults write /Library/Preferences/SystemConfiguration/com.apple.smb.server NetBIOSName -string $hostname" "Set NetBIOS name to $hostname"
fi

# Allow apps downloaded from anywhere
execute "sudo spctl --master-disable" "Allow apps downloaded from anywhere"
execute "defaults write com.apple.LaunchServices LSQuarantine -bool false" "Disable quarantine for downloaded apps"

print_warning "Some changes may require a restart or logout to take effect."

ask_for_confirmation "Would you like to restart your computer now?"
if answer_is_yes; then
    sudo shutdown -r now
fi
