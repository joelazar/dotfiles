#!/bin/bash

cd "$(dirname "${BASH_SOURCE[0]}")" \
    && . "../utils.sh" \
    && . "./utils.sh"

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

install_ruby_package() {
    execute "sudo -H gem install -q  $2" "$1"
}

update_ruby_packages() {
    execute "sudo -H gem update -q" "update ruby packages"
}

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

main() {

    print_in_purple "\n   Ruby\n\n"

    install_package "ruby" "ruby"
    install_package "ruby gem" "rubygems"

    # - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

    update_ruby_packages

    # - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

    printf "\n"

}

main
