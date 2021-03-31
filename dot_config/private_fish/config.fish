set -U fish_greeting

fish_vi_key_bindings

# Wayland specific envvars
set -gx MOZ_ENABLE_WAYLAND 1
set -gx XDG_SESSION_TYPE wayland
set -gx _JAVA_AWT_WM_NONREPARENTING 1

# Make default programs
set -gx BROWSER firefox
set -gx EDITOR nvim
set -gx FILE nnn
set -gx READER zathura
set -gx STATUSBAR waybar
set -gx TERMINAL alacritty
set -gx VISUAL ewrap
set -gx SUDO_ASKPASS $HOME/.local/bin/wofipass

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
set -gx FZF_DEFAULT_OPTS "--height 40% --layout=reverse --border "
set -gx FZF_CTRL_T_COMMAND "$FZF_DEFAULT_COMMAND"
set -gx FZF_CTRL_R_OPTS '--sort --exact --history-size=30000'
set -gx FZF_CTRL_T_OPTS "--preview 'cat {}'"

# BAT options
set -gx BAT_CONFIG_PATH $HOME/.config/bat/bat.conf

# SSH environment file
set -gx SSH_ENV $HOME/.ssh/environment

# nnn settings
set -gx NNN_OPENER xdg-open
set -gx NNN_SSHFS_OPTS sshfs -o follow_symlinks
set -gx NNN_USE_EDITOR 1
set -gx NNN_CONTEXT_COLORS 2136
set -gx NNN_PLUG 'o:fzopen;m:nmount;p:pdfview;l:launch'

# Grim settings
set -gx GRIM_DEFAULT_DIR "$HOME/pictures/screenshots"

# NPM exports
set -gx NODE_PATH $HOME/.node/lib/node_modules $NODE_PATH
set -gx MANPATH $HOME/.node/share/man $MANPATH

if type -q direnv
  eval (direnv hook fish)
end

replay source $HOME/.zsh.local

alias c="clear"
alias cat="bat"
alias ch="clipman pick --print0 --tool=CUSTOM --tool-args=\"fzf --prompt 'pick > ' --bind 'tab:up' --cycle --read0\""
alias chgrp='chgrp --preserve-root'
alias chmod='chmod --preserve-root'
alias chown='chown --preserve-root'
alias diff='colordiff'
alias g="git"
alias lg='lazygit'
alias lzd='lazydocker'
alias ls='exa'
alias logme="script -f $HOME/logs/(date)+\"%d-%b-%y_%H-%M-%S\"_shell.log"
alias mkdir='mkdir -p -v'
alias N='sudo -E nnn -deH'
alias ping='ping -c 5'
alias q="exit"
alias rm='rm -I'
alias yaegi='rlwrap yaegi'
alias vi='nvim'
alias vim='nvim'
alias :q="exit"

alias get-local-ip="ifconfig \
                    | grep 'inet ' \
                    | grep -v '127.0.0.1' \
                    | awk '{print $2}'"

alias get-ext-ip="curl ipinfo.io/ip"

alias dcleannone='docker rmi (docker images | grep "<none>" | awk \'{print $3}\')'
alias dstopall='docker ps -a | awk \'{print $1}\' | tail -n +2 | xargs docker stop'
alias dremoveall='docker ps -a | awk \'{print $1}\' | tail -n +2 | xargs docker rm -fv'
set --universal fzf_fish_custom_keybindings

# \cp is Ctrl+p
bind \cp __fzf_search_current_dir
bind \cr __fzf_search_history
bind \cv $fzf_search_vars_cmd
# The following two key binding use Alt as an additional modifier key to avoid conflicts
bind \e\cl __fzf_search_git_log
bind \e\cs __fzf_search_git_status

# set up the same key bindings for insert mode if using fish_vi_key_bindings
if test "$fish_key_bindings" = fish_vi_key_bindings -o "$fish_key_bindings" = fish_hybrid_key_bindings
    bind --mode insert \cp __fzf_search_current_dir
    bind --mode insert \cr __fzf_search_history
    bind --mode insert \cv $fzf_search_vars_cmd
    bind --mode insert \e\cl __fzf_search_git_log
    bind --mode insert \e\cs __fzf_search_git_status
end

replay source $HOME/.zsh.local

starship init fish | source

# Start Sway at login
if status is-login
    if test -z "$DISPLAY" -a $XDG_VTNR = 1 -a (tty) = "/dev/tty1" -a "(pgrep sway)"
       	sway
    end
end

