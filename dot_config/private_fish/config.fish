if not status is-interactive
    return
end

set -U fish_greeting

fish_vi_key_bindings

# Make default programs
set -gx BROWSER "/Applications/Zen\ Browser.app/Contents/MacOS/zen"
set -gx FILE nnn
set -gx PAGER "bat --plain"
set -gx TERMINAL kitty
# set -gx EDITOR "zed --wait"
# set -gx VISUAL zed
set -gx EDITOR nvim
set -gx VISUAL nvim


# Set nvim as man pager
set -gx MANPAGER 'nvim +Man!'

# Customize PATH
set -gx GOPATH $HOME/go
set -gx GOBIN $GOPATH/bin
fish_add_path $HOME/.yarn/bin
fish_add_path $HOME/.node/bin
fish_add_path $HOME/.local/bin
fish_add_path $GOBIN
fish_add_path $HOME/.cargo/bin
fish_add_path $HOME/.local/share/nvim/mason/bin
fish_add_path $HOME/.rye/py/cpython@3.12.3/bin
fish_add_path $HOME/.modular/bin

# brew specific paths
fish_add_path /opt/homebrew/sbin
fish_add_path /opt/homebrew/bin
fish_add_path /opt/homebrew/opt/ruby/bin
fish_add_path /opt/homebrew/opt/openjdk/bin/

# FZF options
set -gx FD_DEFAULT_COMMAND 'fd --hidden --follow'
set -gx FZF_DEFAULT_COMMAND "$FD_DEFAULT_COMMAND --exclude .git --exclude node_modules --exclude .venv"
set -gx FZF_DEFAULT_OPTS '
  --bind \'ctrl-t:transform:if not string match -q "Files*" $FZF_PROMPT; echo "change-prompt(Files> )+reload:fd --type f --color always"; else; echo "change-prompt(Directories> )+reload:fd --type d --color always"; end\'
  --height 50%
  --layout=reverse
  --border
  --info=inline
  --marker="*"
  --bind "?:toggle-preview"
  --bind "alt-down:half-page-down"
  --bind "alt-up:half-page-up"
  --bind "ctrl-a:toggle-all"
  --bind "ctrl-d:preview-half-page-down"
  --bind "ctrl-u:preview-half-page-up"
  --bind "ctrl-y:execute(echo {+} | pbcopy)"
  --bind \'ctrl-r:transform:if not string match -q "Hidden*" $FZF_PROMPT; echo "change-prompt(Hidden files> )+reload:fd --type f --hidden --follow --no-ignore --color always"; else; echo "change-prompt(Files&Directories> )+reload:fd --hidden --follow --color always --exclude .git --exclude node_modules --exclude .venv"; end\'
'
set fzf_history_opts --sort --exact --history-size=30000
set fzf_fd_opts --hidden --follow --exclude=.git
set fzf_preview_dir_cmd eza -T -la --git --group-directories-first --icons --color=always
set fzf_directory_opts --prompt "Files&Directories> " --bind "ctrl-o:execute($EDITOR {+} &> /dev/tty)"

fzf_configure_bindings --git_status=\e\cs --git_log=\e\cl --directory=\cp --history=\e\cr --processes=\e\cp --variables=\e\ce

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
set -gx NNN_TRASH 2 # configure gio trash
set -gx NNN_FCOLORS 030304020000060801030500 # filetype colors. this mimics dircolors
# d: detail mode
# e: open text files in terminal
# u: use selection, don't prompt to choose between selection and hovered entry
# U: show file's owner and group in status bar
set -gx NNN_OPTS deuU
set -gx NNN_PLUG "c:fzcd;d:diffs;h:fzhist;k:pskill;m:nmount;o:fzopen;p:fzplug;t:preview-tui;z:autojump;"
set -gx NNN_BMS "d:$HOME/Downloads/;c:$HOME/.local/share/chezmoi/;v:$HOME/.config/nvim/"
set -gx NNN_BATSTYLE "changes,numbers"
set -gx NNN_BATTHEME base16

# set custom collation rule - sort dotfiles first, followed by uppercase and lowercase filenames
set -gx LC_COLLATE C

# NPM exports
set -gx NODE_PATH $HOME/.node/lib/node_modules

if test -e $HOME/.config/fish/.local.fish
    source $HOME/.config/fish/.local.fish
end

alias :q="exit"
alias N='sudo -E nnn -deH'
alias c="clear"
alias cat="bat"
alias chgrp='chgrp --preserve-root'
alias chmod='chmod --preserve-root'
alias chown='chown --preserve-root'
alias ci="gh workflow view"
alias g="git"
alias hg="kitty +kitten hyperlinked_grep"
alias icat="kitty +kitten icat"
alias l='eza --icons --group-directories-first'
alias lg='lazygit'
alias lzd='lazydocker'
alias ll='eza -la --git --group-directories-first --icons'
alias ls='eza --icons --group-directories-first'
alias mkdir='mkdir -p -v'
alias ping='ping -c 5'
alias rmf='/bin/rm'
alias q="exit"
alias s="kitty +kitten ssh"
alias lv='NVIM_APPNAME=nvim.legacy nvim'
alias lvi='NVIM_APPNAME=nvim.legacy nvim'
alias lvim='NVIM_APPNAME=nvim.legacy nvim'
alias lnvim='NVIM_APPNAME=nvim.legacy nvim'
alias v='nvim'
alias vi='nvim'
alias vim='nvim'
alias vc='nvim --clean'

# infra
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
alias tf='terraform'

# docker
alias dcleannone='docker rmi (docker images | grep "<none>" | awk \'{print $3}\')'
alias dstopall='docker ps -a | awk \'{print $1}\' | tail -n +2 | xargs docker stop'
alias dremoveall='docker ps -a | awk \'{print $1}\' | tail -n +2 | xargs docker rm -fv'

# git pull++
alias gcodefaultall='fd --type d --hidden \'.git$\' | rev | cut -d \'/\' -f3- | rev | xargs -I{} bash -c \'echo {} && (git -C {} checkout main || git -C {} checkout master) && echo\''
alias gpullall='fd --type d --hidden \'.git$\' | rev | cut -d \'/\' -f3- | rev | xargs -P10 -I{} bash -c \'echo {} && git -C {} pull\''
alias gresetall='fd --type d --hidden \'.git$\' | rev | cut -d \'/\' -f3- | rev | xargs -P10 -I{} bash -c \'echo {} && git -C {} reset --hard && git -C {} clean -fd && git -C {} checkout .\''
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
fnm env --use-on-cd | source
atuin init fish --disable-up-arrow | source
source "$HOME/.cargo/env.fish"

# Done plugin config
set -U __done_min_cmd_duration 10000
set -U __done_exclude n

# The next line updates PATH for the Google Cloud SDK.
if [ -f '/opt/homebrew/Caskroom/google-cloud-sdk/latest/google-cloud-sdk/path.fish.inc' ]
    . '/opt/homebrew/Caskroom/google-cloud-sdk/latest/google-cloud-sdk/path.fish.inc'
end
fish_add_path /Users/joelazar/.modular/bin
