#!/bin/bash

cd "$(dirname "${BASH_SOURCE[0]}")"

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

./cronjobs.sh
./development.sh
./privacy.sh
./services.sh
./terminal.sh
