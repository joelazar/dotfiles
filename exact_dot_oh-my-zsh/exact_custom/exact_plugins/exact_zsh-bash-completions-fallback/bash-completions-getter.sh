
# Copyright 2020: Marco Trevisan <mail@3v1n0.net>
# Original Author: Brian Beffa <brbsix@gmail.com>
# Original source: https://brbsix.github.io/2015/11/29/accessing-tab-completion-programmatically-in-bash/
# License: LGPLv3 (http://www.gnu.org/licenses/lgpl-3.0.txt)
#

compopt() {
    # TODO implement default case addition and removal
    [ -z "$_COMP_OPTIONS" ] &&
        _COMP_OPTIONS=()

    while [ ${#@} -gt 0 ]; do
        case "$1" in
            -o|+o)
                local opt="${2#\'}"
                local opt="${opt%\'}"

                if [ "$1" == "-o" ]; then
                    _COMP_OPTIONS+=("$opt")
                else
                    local del=("$opt")
                    _COMP_OPTIONS=("${_COMP_OPTIONS[@]/$del}")
                fi

                shift 2
            ;;
        esac
    done

    return 0
}

source_bash_completion() {
    local src_name='bash_completion'
    if [ -n "${ZSH_BASH_COMPLETIONS_FALLBACK_PATH}" ] &&
       [ -f "${ZSH_BASH_COMPLETIONS_FALLBACK_PATH}/$src_name" ]; then
        source "${ZSH_BASH_COMPLETIONS_FALLBACK_PATH}/$src_name"
    elif [ -f "/etc/$src_name" ]; then
        source "/etc/$src_name"
    elif [[ $BASH_SOURCE == */* ]] &&
         [ -f "${BASH_SOURCE%/*}/$src_name" ]; then
            source "${BASH_SOURCE%/*}/$src_name"
    else
        local -a dirs=()
        local OIFS=$IFS IFS=: dir
        local lookup_dirs=(${XDG_DATA_DIRS:-/usr/local/share:/usr/share})
        IFS=$OIFS

        for dir in ${lookup_dirs[@]}; do
            if [ -f "$dir/bash-completion/$src_name" ]; then
                source "$dir/bash-completion/$src_name"
                return 0
            fi
        done
    fi

    return 1
}

parse_quoted_arguments() {
    local args="${1#\'}"
    args="${args%\'}"
    local QUOTED_ARGS=()
    quote="${2:-\"}"

    if [[ "${args:$i}" == *"${quote}"* ]]; then
        new_args="${args}"

        for ((i = 1; i < "${#args}"; i++)); do
            if [[ "${args:$i}" =~ [^${quote}]*${quote}([^${quote}]*)${quote} ]]; then
                local m="${BASH_REMATCH[1]}"
                QUOTED_ARGS+=("${m}")
                placeholder="____QUOTED_ARG_${#QUOTED_ARGS[@]}____"
                new_args=${new_args/"${quote}${m}${quote}"/${placeholder}}
                i=$((i + ${#BASH_REMATCH} - 1))
            fi

            if [[ "${args:$i}" != *"${quote}"* ]]; then
                break
            fi
        done

        args="${new_args}"
    fi

    UNQUOTED_ARGS=($args)

    if [ -n "$QUOTED_ARGS" ]; then
        for ((i = 0; i < ${#QUOTED_ARGS[@]}; i++)); do
            placeholder="____QUOTED_ARG_$((i+1))____"
            UNQUOTED_ARGS=("${UNQUOTED_ARGS[@]/$placeholder/"${QUOTED_ARGS[$i]}"}")
        done
    fi
}

parse_complete_options() {
    unset COMPLETE_ACTION
    unset COMPLETE_ACTION_TYPE
    unset COMPLETE_SUPPORTED_COMMANDS
    unset COMPLETE_OPTION
    unset COMPLETE_WORDS

    COMPLETE_ACTION=
    COMPLETE_SUPPORTED_COMMANDS=()
    COMPLETE_WORDS=()
    COMPLETE_OPTION=

    while [ ${#@} -gt 0 ]; do
        case "$1" in
            -F|-C)
                [ -n "$COMPLETE_ACTION" ] &&
                    return 2

                COMPLETE_ACTION="${2}"
                COMPLETE_ACTION_TYPE=${1#-}
                shift 2
            ;;
            -pr|-D|-E|-A|-G|-F|-C|-P|-S)
                shift 2
            ;;
            -o)
                COMPLETE_OPTION="${2}"
                shift 2
            ;;
            -W)
                parse_quoted_arguments "$2"
                COMPLETE_WORDS=("${UNQUOTED_ARGS[@]}")
                shift 2
            ;;
            -X)
                # TODO, but to support this we also need to handle compopt and -o
                shift 2
            ;;
            -*)
                shift
            ;;
            *)
                break
            ;;
        esac
    done

    [ -z "$COMPLETE_ACTION" ] && [ -z "$COMPLETE_WORDS" ] \
        && return;

    while [ ${#@} -gt 0 ]; do
        COMPLETE_SUPPORTED_COMMANDS+=("$1")
        shift
    done
}

get_completions() {
    local COMP_CWORD COMP_LINE COMP_POINT COMP_WORDS COMP_WORDBREAKS
    local completion COMPREPLY=() cmd_name

    _COMP_OPTIONS=()

    COMP_LINE=${ZSH_BUFFER}
    COMP_POINT=${ZSH_CURSOR:-${#COMP_LINE}}
    COMP_WORDBREAKS=${ZSH_WORDBREAKS}
    COMP_WORDS=(${ZSH_WORDS[@]})
    cmd_name=${ZSH_NAME}


    # add '' to COMP_WORDS if the last character of the command line is a space
    [[ "${COMP_LINE[@]: -1}" = ' ' ]] && COMP_WORDS+=('')

    # index of the last word as fallback
    COMP_CWORD=${ZSH_CURRENT:-$(( ${#COMP_WORDS[@]} - 1 ))}

    # load completion
    source_bash_completion

    # load completion, in case getting from the specific command file
    completion_command=$(complete -p "$cmd_name" 2>/dev/null)
    if [ -z "$completion_command" ]; then
        _completion_loader "$cmd_name"
        completion_command=$(complete -p "$cmd_name" 2>/dev/null)
    fi
    # detect completion function or command
    if [[ "$completion_command" =~ \
          ^complete[[:space:]]+(.+) ]]; then
        local args="${BASH_REMATCH[1]}";
        parse_quoted_arguments "$args" "'"
        parse_complete_options "${UNQUOTED_ARGS[@]}"

        completion="$COMPLETE_ACTION"
        _COMP_OPTIONS+=("$COMPLETE_OPTION")
    else
        return 1;
    fi

    # ensure completion was detected
    if ([[ -z "$completion" ]] || [[ "$completion" == "_minimal" ]]); then
        if [ -n "$COMPLETE_WORDS" ]; then
            echo "${_COMP_OPTIONS[@]}"
            printf "%s\n" "${COMPLETE_WORDS[@]}"
            return 0
        fi

        return 1
    fi

    # execute completion function or command (exporting the needed variables)
    # This may fail if compopt is called, but there's no easy way to pre-fill
    # the bash input with some stuff, using only bashy things.
    local -a cmd=("$completion")
    cmd+=("$cmd_name")
    cmd+=("'${COMP_WORDS[${COMP_CWORD}]}'")

    if [ ${COMP_CWORD} -gt 0 ]; then
        cmd+=("'${COMP_WORDS[$((COMP_CWORD-1))]}'");
    else
        cmd+=('');
    fi

    if [ "$COMPLETE_ACTION_TYPE" == 'C' ]; then
        export COMP_CWORD COMP_LINE COMP_POINT COMP_WORDS COMP_WORDBREAKS
        COMPREPLY=($("${cmd[@]}"))
    else
        ${cmd[@]}
    fi

    [ -n "$COMPLETE_WORDS" ] &&
        COMPREPLY+=("${COMPLETE_WORDS[@]}")

    # print options, followed by completions to stdout
    echo "${_COMP_OPTIONS[@]}"
    printf "%s\n" "${COMPREPLY[@]}"
}

get_defined_completions() {
    local defined_completions=()
    # Redefine complete bash builtin function to catch all the defined actions
    # We may call `builtin complete "$@"` at the end to override the actual
    # function, but this doesn't seem to be needed in this case, so let's save
    # some cycles.
    function complete() {
        parse_complete_options "$@"
        defined_completions+=("${COMPLETE_SUPPORTED_COMMANDS[@]}")
    }

    source_bash_completion
    unset -f complete

    printf "%s\n" "${defined_completions[@]}"
}
