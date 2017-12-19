#!/bin/bash

cd "$(dirname "${BASH_SOURCE[0]}")" \
    && . "../utils.sh" \
    && . "./utils.sh"

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

install_pip_package() {

    execute \
        ". $HOME/.bash.local \
            && sudo -H pip install -q  $2" \
        "$1"

}

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

main() {

    print_in_purple "\n   Python\n\n"

    install_package "python" "python"
    install_package "python2-pip" "python2-pip"
    install_package "python3" "python3"
    install_package "python-pip" "python-pip"
    # - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

    install_pip_package "pip (update)" "--upgrade pip"

    # - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

    printf "\n"

}

main
