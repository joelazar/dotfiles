#!/bin/bash

cd "$(dirname "${BASH_SOURCE[0]}")" &&
  . "../utils.sh"

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

declare -r INSTALLED_PACKAGES=$(yay -Q)

install_package_manager() {
  execute "which yay && ( [ $? -eq 0 ] || yaourt -S --noconfirm yay)" "YAY"
}

autoremove() {
  execute "sudo yay -Qtd --noconfirm || true" "YAY (autoremove)"
}

install_package() {
  declare -r PACKAGE="$2"
  declare -r PACKAGE_READABLE_NAME="$1"

  if ! package_is_installed "$PACKAGE"; then
    execute "yay -S --noconfirm --needed $PACKAGE" "$PACKAGE_READABLE_NAME"
  else
    print_success "$PACKAGE_READABLE_NAME"
  fi
}

package_is_installed() {
  echo $INSTALLED_PACKAGES | grep -q "$1 " &>/dev/null
}

update() {
  execute "yay -Syyu --noconfirm" "YAY (update)"
}

clean_up_cache() {
  execute "paccache -rk1 && paccache -ruk0" "Clean up cached packages"
}
