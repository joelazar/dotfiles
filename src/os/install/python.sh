#!/bin/bash

cd "$(dirname "${BASH_SOURCE[0]}")" \
    && . "../utils.sh"

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

install_pip_package() {

    execute \
        ". $HOME/.bash.local \
            && pip install -q  $2" \
        "$1"

}

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

main() {

    print_in_purple "\n   python\n\n"

    install_package "python" "python"
    install_package "python3" "python3"
    # - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

    install_pip_package "pip (update)" "--upgrade pip"

    # - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

    printf "\n"

    install_pip_package "thefuck" "thefuck"

}

main
