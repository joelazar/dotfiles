#!/bin/bash

cd "$(dirname "${BASH_SOURCE[0]}")" \
    && . "../utils.sh" \
    && . "./utils.sh"

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

install_pip_package() {
    execute "sudo -H pip$1 install -q  $3" "$2"
}

update_python_packages() {
    execute "pip$1 freeze --local | grep -v '^\-e' | cut -d = -f 1  | xargs -n1 sudo pip$1 install -U" \
      "update python$1 packages"
}

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

main() {

    print_in_purple "\n   Python\n\n"

    install_package "python" "python"
    install_package "python2-pip" "python2-pip"
    install_package "python3" "python3"
    install_package "python-pip" "python-pip"

    # - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

    install_pip_package "2" "pip2 (update)" "--upgrade pip"
    install_pip_package "3" "pip3 (update)" "--upgrade pip"
    install_pip_package "3" "pipenv" "pipenv"
    install_pip_package "2" "pipdeptree" "pipdeptree"
    install_pip_package "3" "pipdeptree" "pipdeptree"

    # - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

    update_python_packages "2"
    update_python_packages "3"

    # - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

    printf "\n"

}

main
