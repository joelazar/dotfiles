#!/bin/bash

cd "$(dirname "${BASH_SOURCE[0]}")" &&
  . "../utils.sh" &&
  . "./utils.sh"

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

install_extension() {

  execute \
    "code --install-extension $1" \
    "Installing $1 extension to Code"

}

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

main() {

  print_in_purple "\n   Code\n\n"

  install_extension "alefragnani.Bookmarks"
  install_extension "eamodio.gitlens"
  install_extension "ms-azuretools.vscode-docker"
  install_extension "ms-python.python"
  install_extension "ms-vscode.Go"
  install_extension "ms-vscode.cpptools"
  install_extension "vscode-icons-team.vscode-icons"
  install_extension "vscodevim.vim"

  printf "\n"

}

main
