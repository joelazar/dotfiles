#!/usr/bin/env bash
#
# Shared helpers for the restic-* scripts. Source, do not execute.
#

require_repository_env() {
    if [[ -z "${RESTIC_REPOSITORY:-}" ]]; then
        echo '❌ RESTIC_REPOSITORY is not set' >&2
        exit 1
    fi
}

require_volume_mounted() {
    local volume
    volume="$(dirname "$RESTIC_REPOSITORY")"
    if [[ ! -d "$volume" ]]; then
        printf '❌ Backup volume "%s" is not mounted\n' "$volume" >&2
        exit 1
    fi
}

# Prompt for the repository password once and export it so every restic
# invocation in the script reuses it. Skipped when restic already has a
# password source from the environment.
ensure_password() {
    if [[ -n "${RESTIC_PASSWORD:-}" || -n "${RESTIC_PASSWORD_FILE:-}" || -n "${RESTIC_PASSWORD_COMMAND:-}" ]]; then
        return
    fi
    local password
    if command -v gum >/dev/null 2>&1; then
        password="$(gum input --password --placeholder 'restic repository password')"
    else
        read -rsp '🔑 restic repository password: ' password
        echo
    fi
    if [[ -z "$password" ]]; then
        echo '❌ Empty password' >&2
        exit 1
    fi
    export RESTIC_PASSWORD="$password"
}

repository_exists() {
    restic cat config >/dev/null 2>&1
}

require_repository_exists() {
    if ! repository_exists; then
        printf '❌ No restic repository found at "%s"\n' "$RESTIC_REPOSITORY" >&2
        exit 1
    fi
}
