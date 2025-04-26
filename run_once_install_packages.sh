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

# Install Homebrew if not present
if ! cmd_exists "brew"; then
    print_in_purple "Installing Homebrew\n"
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

    # Setup Homebrew in PATH
    if [ -f /opt/homebrew/bin/brew ]; then
        eval "$(/opt/homebrew/bin/brew shellenv)"
        print_success "Homebrew installed and configured"
    else
        print_error "Failed to install Homebrew"
    fi
else
    print_success "Homebrew already installed"
fi

# Install and configure Chezmoi
if ! cmd_exists "chezmoi"; then
    print_in_purple "Installing and configuring Chezmoi\n"
    brew install chezmoi

    # Check if dotfiles are already cloned
    if [ ! -d "$HOME/.local/share/chezmoi" ]; then
        git clone git@github.com:joelazar/dotfiles.git ~/.local/share/chezmoi
        print_result $? "Cloned dotfiles repository"
    else
        print_success "Dotfiles repository already exists"
    fi

    # Initialize and apply Chezmoi
    chezmoi init
    print_result $? "Initialized Chezmoi"

    chezmoi apply
    print_result $? "Applied Chezmoi configuration"
else
    print_success "Chezmoi already installed"
fi

# Determine which Brewfile to use based on the type template variable
print_in_purple "Installing packages from Brewfile\n"
if [ "$(chezmoi data | jq -r '.type // ""')" = "work" ]; then
    print_info "Using work Brewfile"
    if [ -f "$SOURCE_DIR/Brewfile.work" ]; then
        brew bundle --file="$SOURCE_DIR/Brewfile.work"
        print_result $? "Installed packages from Brewfile.work"
    else
        print_error "Brewfile.work not found"
    fi
else
    print_info "Using private Brewfile"
    if [ -f "$SOURCE_DIR/Brewfile.private" ]; then
        brew bundle --file="$SOURCE_DIR/Brewfile.private"
        print_result $? "Installed packages from Brewfile.private"
    else
        print_error "Brewfile.private not found"
    fi
fi

# Install Rust with rustup
if ! cmd_exists "rustc"; then
    print_in_purple "Installing Rust using rustup\n"
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y

    # Source cargo environment
    if [ -f "$HOME/.cargo/env" ]; then
        . "$HOME/.cargo/env"
        print_success "Rust installed and configured"
    else
        print_error "Failed to install Rust"
    fi
else
    print_success "Rust already installed"
fi

print_in_purple "Package managers\n"

print_in_purple "NPM packages\n"

install_npm_package "@anthropic-ai/claude-code"
install_npm_package "@openai/codex"
install_npm_package "npm-check"
install_npm_package "rag-crawler"
install_npm_package "yalc"

print_in_purple "Go packages\n"

install_go_package "github.com/cosmos72/gomacro@latest" "gomacro"

print_in_purple "GH plugins\n"

# Check if gh is installed and authenticated
if cmd_exists "gh"; then
    # Check if authenticated
    if ! gh auth status &>/dev/null; then
        print_warning "GitHub CLI not authenticated. Please authenticate first by running:\n   gh auth login"
        print_warning "Plugin installation may fail without authentication."

        ask_for_confirmation "Would you like to authenticate now?"
        if answer_is_yes; then
            execute "gh auth login" "Authenticate GitHub CLI"
        fi
    else
        print_success "GitHub CLI authenticated"
    fi

    # Install GH plugins
    install_gh_plugin "dlvhdr/gh-dash"
    install_gh_plugin "github/gh-copilot"
else
    print_error "GitHub CLI (gh) not installed. Install it with 'brew install gh' first."
fi

# Install Yazi plugins
if cmd_exists "yazi"; then
    print_in_purple "Installing Yazi plugins\n"

    # Make sure yazi config directory exists
    mkdir -p ~/.config/yazi/flavors

    # Get list of installed plugins
    installed_plugins=$(ya pack -l 2>/dev/null | awk '{print $1}')

    # Install plugins via yazi package manager if not already installed
    if ! echo "$installed_plugins" | grep -q "toggle-pane"; then
        execute "ya pack -a yazi-rs/plugins:toggle-pane" "Yazi toggle-pane plugin"
    else
        print_success "Yazi toggle-pane plugin already installed"
    fi

    if ! echo "$installed_plugins" | grep -q "smart-filter"; then
        execute "ya pack -a yazi-rs/plugins:smart-filter" "Yazi smart-filter plugin"
    else
        print_success "Yazi smart-filter plugin already installed"
    fi

    if ! echo "$installed_plugins" | grep -q "diff"; then
        execute "ya pack -a yazi-rs/plugins:diff" "Yazi diff plugin"
    else
        print_success "Yazi diff plugin already installed"
    fi

    if ! echo "$installed_plugins" | grep -q "git"; then
        execute "ya pack -a yazi-rs/plugins:git" "Yazi git plugin"
    else
        print_success "Yazi git plugin already installed"
    fi

    if ! echo "$installed_plugins" | grep -q "ouch"; then
        execute "ya pack -a ndtoan96/ouch" "Yazi ouch plugin"
    else
        print_success "Yazi ouch plugin already installed"
    fi

    # Install theme if not already present
    if [ ! -d "$HOME/.config/yazi/flavors/tokyo-night.yazi" ]; then
        execute "git clone https://github.com/BennyOe/tokyo-night.yazi.git ~/.config/yazi/flavors/tokyo-night.yazi" "Yazi Tokyo Night theme"
    else
        print_success "Yazi Tokyo Night theme already installed"
    fi
else
    print_warning "Yazi not installed. Skipping Yazi plugins installation."
    print_warning "Install Yazi first with 'brew install yazi' and re-run this script."
fi

# Install Magic from Modular
if ! cmd_exists "magic"; then
    print_in_purple "Installing Magic from Modular\n"

    # Install Magic
    curl -ssL https://magic.modular.com/deb13a78-95b6-40bf-8bd0-52802eb302a8 | bash
    print_result $? "Install Magic"

    # Add fish completion if fish is the shell
    if [ "$SHELL" = "/opt/homebrew/bin/fish" ] && [ -d "$HOME/.config/fish/completions" ]; then
        # Check if completion already added
        if ! grep -q "magic completion" "$HOME/.config/fish/completions/magic.fish" 2>/dev/null; then
            echo 'magic completion --shell fish | source' >>"$HOME/.config/fish/completions/magic.fish"
            print_result $? "Add Magic completion to fish"
        else
            print_success "Magic fish completion already configured"
        fi
    fi
else
    print_success "Magic already installed"
fi
