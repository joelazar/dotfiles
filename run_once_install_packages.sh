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

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
# Core package managers
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

# Install core package managers and dotfiles manager
install_homebrew
install_chezmoi
install_brew_packages
install_rust

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
# Language-specific packages
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

# BUN packages
BUN_PACKAGES=(
    "@sourcegraph/amp"
    # "@anthropic-ai/claude-code" only once, then local install
    ccusage
    "npm-check"
)

install_packages_from_list "BUN" "install_bun_package" "${BUN_PACKAGES[@]}"

# Go packages
GO_PACKAGES=(
    "github.com/cosmos72/gomacro@latest:gomacro"
)

print_in_purple "Go packages\n"
for package in "${GO_PACKAGES[@]}"; do
    IFS=':' read -r pkg_path pkg_name <<<"$package"
    install_go_package "$pkg_path" "${pkg_name:-$(basename "$pkg_path")}"
done

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
# Tools and plugins
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

# GitHub CLI plugins
if setup_github_cli; then
    GH_PLUGINS=(
        "dlvhdr/gh-dash"
        "github/gh-copilot"
    )

    print_in_purple "GH plugins\n"
    for plugin in "${GH_PLUGINS[@]}"; do
        install_gh_plugin "$plugin"
    done
fi

# Yazi file manager plugins
YAZI_PLUGINS=(
    "yazi-rs/plugins:toggle-pane"
    "yazi-rs/plugins:smart-filter"
    "yazi-rs/plugins:diff"
    "yazi-rs/plugins:git"
    "ndtoan96/ouch"
)

install_yazi_plugins "${YAZI_PLUGINS[@]}"

# Install Magic from Modular
install_magic
