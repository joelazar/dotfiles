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
set -gx TERMINAL kitty
set -gx VISUAL nvim

# Set cursor theme
set -gx XCURSOR_THEME Adwaita
set -gx SWAY_CURSOR_THEME Adwaita
set -gx XCURSOR_SIZE 16
set -gx SWAY_CURSOR_SIZE 16

# Desktop settings for screen casting
set -gx XDG_SESSION_DESKTOP sway
set -gx XDG_CURRENT_DESKTOP sway

# Set nvim as man pager
set -gx MANPAGER 'nvim +Man!'

# Customize PATH
set -gx GOPATH $HOME/go
fish_add_path $HOME/.yarn/bin
fish_add_path $HOME/.node/bin
fish_add_path $HOME/.local/bin
fish_add_path /usr/lib/go/bin
fish_add_path $GOPATH/bin
fish_add_path $HOME/.cargo/bin
fish_add_path $HOME/.local/share/nvim/mason/bin
fish_add_path $HOME/.local/bin/kitty_nightly/kitty.app/bin

# Set custom askpass
set -gx SUDO_ASKPASS $HOME/.local/bin/bemenu-askpass
set -gx SSH_ASKPASS $HOME/.local/bin/bemenu-askpass
set -gx SSH_ASKPASS_REQUIRE prefer
alias sudo="sudo -A"
alias yay="yay --sudoflags '-A'"

# FZF options
set -gx FZF_DEFAULT_COMMAND 'fd --type f --hidden --follow --exclude .git --exclude node_modules'
set -gx FZF_DEFAULT_OPTS '--height 50% --layout=reverse --border --info=inline --marker="*" --bind "ctrl-y:execute(echo {+} | wl-copy)" --bind "ctrl-a:select-all" --bind "?:toggle-preview"'
set fzf_history_opts --sort --exact --history-size=30000
set fzf_fd_opts --hidden --follow --exclude=.git
set fzf_preview_dir_cmd exa --all --color=always

fzf_configure_bindings --git_status=\e\cs --git_log=\e\cl --directory=\cp --history=\e\cr --processes=\e\cp --variables=\e\ce

# BEMENU options
set -gx BEMENU_OPTS '-i --fn "Roboto Mono 13" --hp 6 -b --fb "#1e1e2e" --ff "#94e2d5" --nb "#1e1e2e" --nf "#f5e0dc" --tb "#1e1e2e" --hb "#cba6f7" --hf "#11111b" --tf "#cba6f7" --nf "#f5e0dc" --af "#f5e0dc" --ab "#1e1e2e"'

# BAT options
set -gx BAT_CONFIG_PATH $HOME/.config/bat/bat.conf

# ripgrep options
set -gx RIPGREP_CONFIG_PATH $HOME/.config/ripgrep/config

# SSH environment file
set -gx SSH_ENV $HOME/.ssh/environment

# Kitty config
set -gx KITTY_LISTEN_ON "unix:/tmp/kitty-$KITTY_PID"

# nnn settings
set -gx NNN_FIFO /tmp/nnn.fifo # breaks NnnExplorer feature
set -gx NNN_SSHFS_OPTS sshfs -o follow_symlinks
set -gx NNN_USE_EDITOR 1
set -gx NNN_COLORS 2136
set -gx NNN_OPENER xdg-open
set -gx NNN_TRASH 2 # configure gio trash
set -gx NNN_FCOLORS 030304020000060801030500 # filetype colors. this mimics dircolors
# d: detail mode
# e: open text files in terminal
# u: use selection, don't prompt to choose between selection and hovered entry
# r: show cp/mv progress
# U: show file's owner and group in status bar
set -gx NNN_OPTS dreuU
set -gx NNN_PLUG "c:fzcd;d:diffs;h:fzhist;k:pskill;m:nmount;o:fzopen;p:fzplug;t:preview-tui;z:autojump;"
set -gx NNN_BMS "d:$HOME/Downloads/;c:$HOME/.local/share/chezmoi/;v:$HOME/.config/nvim/"

# set custom collation rule - sort dotfiles first, followed by uppercase and lowercase filenames
set -gx LC_COLLATE C

# z settings
set -U Z_DATA "$HOME/.z"
set -U ZO_METHOD nvim

# Grim settings
set -gx GRIM_DEFAULT_DIR "$HOME/pictures/screenshots"

# NPM exports
set -gx NODE_PATH $HOME/.node/lib/node_modules

# PARUZ config
set -gx PARUZ yay

# zk dir
set -gx ZK_NOTEBOOK_DIR $HOME/notes

set sponge_delay 25

if test -e $HOME/.config/fish/.local.fish
    source $HOME/.config/fish/.local.fish
end

if test -e $HOME/.config/fish/github_copilot_cli.fish
    source $HOME/.config/fish/github_copilot_cli.fish
end

if test -e /opt/google-cloud-sdk/path.fish.inc
    source /opt/google-cloud-sdk/path.fish.inc
end

alias :q="exit"
alias N='sudo -E nnn -deH'
alias b='buku --suggest'
alias c="clear"
alias cat="bat"
alias chgrp='chgrp --preserve-root'
alias chmod='chmod --preserve-root'
alias chown='chown --preserve-root'
alias ci="gh workflow view"
alias d="kitty +kitten diff"
alias ddg="BROWSER=w3m ddgr -n 5"
alias e='nvim'
alias ff='firefox'
alias g="git"
alias icat="kitty +kitten icat"
alias l='exa --icons --group-directories-first'
alias lg='lazygit'
alias ll='exa -la --git --group-directories-first --icons'
alias logme="script -f /tmp/(date +\"%Y%m%d_%H%M\")_shell.log"
alias ls='exa --icons --group-directories-first'
alias mkdir='mkdir -p -v'
alias ping='ping -c 5'
alias q="exit"
alias rg="kitty +kitten hyperlinked_grep"
alias s="kitty +kitten ssh"
alias v='nvim'
alias vc='nvim --clean'
alias vi='nvim'
alias vim='nvim'
alias yaegi='rlwrap yaegi'

# kubectl
alias k='kubectl'
alias kd='kubectl describe'
alias kdd='kubectl describe deployment'
alias kdp='kubectl describe pod'
alias kei='kubectl exec -it'
alias kg='kubectl get'
alias kgall='kubectl get --all-namespaces all'
alias kgd='kubectl get deployments'
alias kgp='kubectl get pod'
alias kgsvc='kubectl get service'
alias kl='kubectl logs --all-containers=true'
alias krm='kubectl delete'

# docker
alias dcleannone='docker rmi (docker images | grep "<none>" | awk \'{print $3}\')'
alias dstopall='docker ps -a | awk \'{print $1}\' | tail -n +2 | xargs docker stop'
alias dremoveall='docker ps -a | awk \'{print $1}\' | tail -n +2 | xargs docker rm -fv'

# git pull++

alias gcodefaultall='fd --type d --hidden \'.git$\' | rev | cut -d \'/\' -f3- | rev | xargs -I{} bash -c \'echo {} && (git -C {} checkout main || git -C {} checkout master) && echo\''
alias gpullall='fd --type d --hidden \'.git$\' | rev | cut -d \'/\' -f3- | rev | xargs -I{} bash -c \'echo {} && git -C {} status -b -s && git -C {} pull && echo\''
alias gpullallfast='fd --type d --hidden \'.git$\' | rev | cut -d \'/\' -f3- | rev | xargs -P10 -I{} git -C {} pull'
alias gstatusall='fd --type d --hidden \'.git$\' | rev | cut -d \'/\' -f3- | rev | xargs -I{} bash -c \'echo {} && git -C {} show --summary && echo\''

# other
alias get-local-ip="ifconfig \
                    | grep 'inet ' \
                    | grep -v '127.0.0.1' \
                    | awk '{print $2}'"
alias get-ext-ip="http -b ipinfo.io/ip"
alias urldecode='python3 -c "import sys, urllib.parse as ul; \
    print(ul.unquote_plus(sys.argv[1]))"'
alias urlencode='python3 -c "import sys, urllib.parse as ul; \
    print (ul.quote_plus(sys.argv[1]))"'
alias wttr="http -b v2.wttr.in"
alias wttr-cph="http -b v2.wttr.in/Copenhagen"

starship init fish | source
zoxide init fish | source
direnv hook fish | source
atuin init fish --disable-up-arrow | source

# Done plugin config
set -U __done_min_cmd_duration 10000
set -U __done_exclude n

# Start Sway at login
if status is-login
    if test -z "$DISPLAY" -a $XDG_VTNR = 1 -a (tty) = /dev/tty1 -a "(pgrep sway)"
        sway
    end
end
