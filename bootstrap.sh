#!/bin/bash

# Bootstrap script for initial dotfiles setup
# This script installs Homebrew and chezmoi, then initializes the dotfiles
# Run this script BEFORE running any chezmoi commands

set -e  # Exit on any error

# Tokyo Night theme colors
readonly PURPLE="#bd93f9"
readonly GREEN="#50fa7b"
readonly RED="#ff5555"
readonly YELLOW="#f1fa8c"
readonly CYAN="#8be9fd"
readonly ORANGE="#ffb86c"

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

cmd_exists() {
    command -v "$1" &>/dev/null
}

print_in_color() {
    printf "%b" "$1"
}

print_in_purple() {
    print_in_color "\033[38;2;189;147;249m$1\033[m\n"
}

print_in_green() {
    print_in_color "\033[38;2;80;250;123m$1\033[m\n"
}

print_in_yellow() {
    print_in_color "\033[38;2;241;250;140m$1\033[m\n"
}

print_in_red() {
    print_in_color "\033[38;2;255;85;85m$1\033[m\n"
}

print_error() {
    print_in_red "❌ $1"
}

print_success() {
    print_in_green "✅ $1"
}

print_warning() {
    print_in_yellow "⚠️  $1"
}

ask_for_confirmation() {
    print_in_yellow "❓ $1 (y/n): "
    read -r yn
    case $yn in
        [Yy]* ) return 0;;
        * ) return 1;;
    esac
}

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

install_homebrew() {
    if ! cmd_exists "brew"; then
        print_in_purple "🍺 Installing Homebrew..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

        # Setup Homebrew in PATH for current session
        if [ -f /opt/homebrew/bin/brew ]; then
            eval "$(/opt/homebrew/bin/brew shellenv)"
            print_success "Homebrew installed and configured"
        elif [ -f /usr/local/bin/brew ]; then
            eval "$(/usr/local/bin/brew shellenv)"
            print_success "Homebrew installed and configured"
        else
            print_error "Failed to install Homebrew"
            return 1
        fi
    else
        print_success "Homebrew already installed"
    fi
}

install_chezmoi() {
    if ! cmd_exists "chezmoi"; then
        print_in_purple "🏠 Installing chezmoi..."
        if cmd_exists "brew"; then
            brew install chezmoi
            print_success "Chezmoi installed successfully"
        else
            print_error "Homebrew not available, cannot install chezmoi"
            return 1
        fi
    else
        print_success "Chezmoi already installed"
    fi
}

initialize_dotfiles() {
    local repo_url="https://github.com/joelazar/dotfiles.git"

    print_in_purple "📁 Initializing dotfiles repository..."

    # Check if dotfiles are already cloned
    if [ ! -d "$HOME/.local/share/chezmoi" ]; then
        if ask_for_confirmation "Clone dotfiles repository from $repo_url?"; then
            chezmoi init --apply "$repo_url"
            print_success "Dotfiles repository cloned and applied"
        else
            print_warning "Skipping dotfiles initialization"
            return 1
        fi
    else
        print_success "Dotfiles repository already exists"
        if ask_for_confirmation "Apply existing dotfiles configuration?"; then
            chezmoi apply
            print_success "Applied existing dotfiles configuration"
        fi
    fi
}

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

main() {
    echo ""
    print_in_purple "🚀 Dotfiles Bootstrap Script"
    print_in_yellow "This script will install Homebrew and chezmoi, then initialize your dotfiles."
    echo ""

    if ! ask_for_confirmation "Continue with bootstrap installation?"; then
        print_warning "Bootstrap cancelled"
        exit 0
    fi

    echo ""
    print_in_purple "📦 Installing prerequisites..."

    # Install Homebrew
    install_homebrew

    # Install chezmoi
    install_chezmoi

    # Initialize dotfiles
    initialize_dotfiles

    echo ""
    print_success "🎉 Bootstrap complete!"
    print_in_yellow "Next steps:"
    print_in_yellow "  1. Run 'chezmoi apply' to apply any remaining configurations"
    print_in_yellow "  2. Run the generated package installation script to install packages"
    print_in_yellow "  3. Restart your shell or source your shell configuration"
    echo ""
}

# Run main function
main "$@"