set -U fish_greeting

fish_vi_key_bindings

# Wayland specific envvars
set -gx MOZ_ENABLE_WAYLAND 1
set -gx MOZ_DBUS_REMOTE 1
set -gx MOZ_WEBRENDER 1
set -gx MOZ_ACCELERATED 1
set -gx XDG_SESSION_TYPE wayland
set -gx _JAVA_AWT_WM_NONREPARENTING 1

# Make default programs
set -gx BROWSER firefox
set -gx EDITOR nvim
set -gx FILE nnn
set -gx READER zathura
set -gx PAGER "bat --plain"
set -gx STATUSBAR waybar
set -gx TERMINAL alacritty
set -gx VISUAL ewrap

# Set cursor theme
set -gx XCURSOR_THEME Adwaita
set -gx SWAY_CURSOR_THEME Adwaita
set -gx XCURSOR_SIZE 16
set -gx SWAY_CURSOR_SIZE 16

# Desktop settings for screen casting
set -gx XDG_CURRENT_DESKTOP sway

# Set bat as man pager
set -gx MANPAGER "sh -c 'col -bx | bat -l man -p'"

# Customize PATH
set -gx GOPATH $HOME/go
set -gx PATH $HOME/.node/bin $HOME/.yarn/bin $HOME/.local/bin $HOME/.SpaceVim/bin /usr/lib/go/bin $GOPATH/bin $PATH

# FZF options
set -gx FZF_DEFAULT_COMMAND 'fd --type f --hidden --follow --exclude .git'
set -gx FZF_DEFAULT_OPTS '--height 90% --layout=reverse --border --info=inline --marker="*" --bind "ctrl-y:execute(echo {+} | wl-copy)" --bind "ctrl-a:select-all" --bind "?:toggle-preview"'
set fzf_history_opts --sort --exact --history-size=30000
set fzf_fd_opts --hidden --follow --exclude=.git
set fzf_preview_dir_cmd exa --all --color=always

fzf_configure_bindings --git_status=\e\cs --history=\cr --variables --git_log=\e\cl --directory=\cp

# BAT options
set -gx BAT_CONFIG_PATH $HOME/.config/bat/bat.conf

# ripgrep options
set -gx RIPGREP_CONFIG_PATH $HOME/.config/ripgrep/config

# SSH environment file
set -gx SSH_ENV $HOME/.ssh/environment

# nnn settings
set -gx NNN_FIFO /tmp/nnn.fifo
set -gx NNN_OPENER handlr-open
set -gx NNN_SSHFS_OPTS sshfs -o follow_symlinks
set -gx NNN_USE_EDITOR 1
set -gx NNN_FCOLORS c1e2272e006033f7c6d6abc4
set -gx NNN_CONTEXT_COLORS 2136
set -gx NNN_PLUG 'k:pskill;t:preview-tui;o:fzopen;m:nmount;p:pdfview;z:fzz;h:fzhist;d:diffs'

# z settings
set -U Z_DATA "$HOME/.z"
set -U ZO_METHOD nvim

# Grim settings
set -gx GRIM_DEFAULT_DIR "$HOME/pictures/screenshots"

# NPM exports
set -gx NODE_PATH $HOME/.node/lib/node_modules $NODE_PATH

if type -q direnv
    eval (direnv hook fish)
end

if test -e $HOME/.config/fish/functions/local.fish
    source $HOME/.config/fish/functions/local.fish
end

alias c="clear"
alias cat="bat"
alias xdg-open="handlr open"
alias ch="clipman pick --print0 --tool=CUSTOM --tool-args=\"fzf --prompt 'pick > ' --bind 'tab:up' --cycle --read0\""
alias chgrp='chgrp --preserve-root'
alias chmod='chmod --preserve-root'
alias chown='chown --preserve-root'
alias g="git"
alias gt="gotestsum --format standard-verbose -- -cover"
alias lg='lazygit'
alias lzd='lazydocker'
alias ls='exa'
alias logme="script -f /tmp/(date)+\"%d-%b-%y_%H-%M-%S\"_shell.log"
alias mkdir='mkdir -p -v'
alias N='sudo -E nnn -deH'
alias ping='ping -c 5'
alias q="exit"
alias rm='rm -I'
alias yaegi='rlwrap yaegi'
alias vi='nvim'
alias vim='nvim'
alias :q="exit"

# kubectl
alias k='kubectl'
alias kg='kubectl get'
alias kd='kubectl describe'
alias krm='kubectl delete'
alias kgall='kubectl get --all-namespaces all'
alias kgp='kubectl get pod'
alias kgd='kubectl get deployments'
alias kgsvc='kubectl get service'
alias kl='kubectl logs'
alias kei='kubectl exec -it'

alias get-local-ip="ifconfig \
                    | grep 'inet ' \
                    | grep -v '127.0.0.1' \
                    | awk '{print $2}'"

alias get-ext-ip="http -b ipinfo.io/ip"

alias weather="http -b v2.wttr.in"

alias dcleannone='docker rmi (docker images | grep "<none>" | awk \'{print $3}\')'
alias dstopall='docker ps -a | awk \'{print $1}\' | tail -n +2 | xargs docker stop'
alias dremoveall='docker ps -a | awk \'{print $1}\' | tail -n +2 | xargs docker rm -fv'


starship init fish | source

# Start Sway at login
if status is-login
    if test -z "$DISPLAY" -a $XDG_VTNR = 1 -a (tty) = /dev/tty1 -a "(pgrep sway)"
        sway
    end
end
