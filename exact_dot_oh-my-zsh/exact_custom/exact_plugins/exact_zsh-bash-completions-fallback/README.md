# zsh-bash-completions-fallback

This plugin is intended to use the bash completions when a zsh completion is not
available.

While this could be supported natively via `bashcompinit`, this doesn't
actually work most of the times, as completion scripts may use syntax not
supported by zsh, and so it's just better to implement this querying the bash
itself, using a bash script called at completion time (based on [Brian Baffa
implementation](https://brbsix.github.io/2015/11/29/accessing-tab-completion-programmatically-in-bash/)
and including various fixes to support commands and completion parameters).

Make sure you load this after other plugins to prevent their completions to be
replaced by the (simpler) bash ones.

Most of all bash completions can now work as they precisely do in bash, as per
the `compopt` simulation that is added here. It may be used to control the
output or avoid adding spaces or limit the results.

The plugin by default works by lazy-loading the completions the first time you
hit TAB to complete a command, however this can be controlled using the
`$ZSH_BASH_COMPLETIONS_FALLBACK_LAZYLOAD_DISABLE` parameter, to load them all
on startup.

If a new bash completion has been installed in the system, you can just restart
zsh or call `_bash_completions_load`, if instead you want this to be handled
automatically, you can use `$ZSH_BASH_COMPLETIONS_FALLBACK_LAZYLOAD_AUTO_UPDATE`
to update all the the available completions at every TAB-completion.
This is disabled by default, to avoid IO operations at each completion, but it
is still very fast in most of the platforms.

Once loaded you can see all the completions available via bash (through this
script) using:

    _bash_completions_fallback_list_handled_completions


Requirements
------------------------------------------------------------------------------

* [ZSH](http://zsh.sourceforge.net) 4.3 or newer
* [GNU Bash](https://www.gnu.org/software/bash/) 4 or newer

Install
------------------------------------------------------------------------------

Using [Oh-my-zsh](https://github.com/robbyrussell/oh-my-zsh):

1. Clone this repository in oh-my-zsh's plugins directory:

        git clone https://github.com/3v1n0/zsh-bash-completions-fallback ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-bash-completions-fallback

2. Activate the plugin in `~/.zshrc` (make sure it's set as the last one not to
   replace completions provided by other plugins):

        plugins=( [plugins...] zsh-bash-completions-fallback)

3. Source `~/.zshrc` (or restart zsh) to take changes into account

        source ~/.zshrc

Using [Zinit](https://github.com/zdharma/zinit):

- If you're using normal loading mode:

        # Replace `light` with `load` if you want some more debugging
        zinit ice depth=1 # optional, but avoids downloading the full history
        zinit light 3v1n0/zsh-bash-completions-fallback

- If you're using turbo mode, you can avoid using the internal lazy mode:

        zinit wait lucid nocd depth=1 \
          atinit='ZSH_BASH_COMPLETIONS_FALLBACK_LAZYLOAD_DISABLE=true' \
            for 3v1n0/zsh-bash-completions-fallback

- Add those to your `~/.zshrc` to keep the changes persistent

Using other plugins manager:

        # Depending on the tool the syntax may vary but it's generally just
        $your_plugin_manager 3v1n0/zsh-bash-completions-fallback

Manual installation:

1. Clone this repository in a folder (like ~/.zsh-bash-completions-fallback):

        git clone https://github.com/3v1n0/zsh-bash-completions-fallback $HOME/.zsh-bash-completions-fallback

2. Add to your `~/.zshrc`:

        source $HOME/.zsh-bash-completions-fallback/zsh-bash-completions-fallback.plugin.zsh

3. Source `~/.zshrc` (or restart zsh) to start using the plugin

        # This plugin requires compinit, so make sure that your ~/.zshrc or
        # your package manager loads it before, otherwise this is needed
        #autoload -U compinit && compinit
        source ~/.zshrc

4. Of course in case you want to test it temporary you just have to `source` the plugin file (`zsh-bash-completions-fallback.plugin.zsh`)

Configuration
------------------------------------------------------------------------------

This script defines the following global variables. You may override their
default values only after having loaded this script into your ZSH session.

* `ZSH_BASH_COMPLETIONS_FALLBACK_PATH` overrides the default bash completions
  path that is set to `/usr/share/bash-completion` by default.

* `ZSH_BASH_COMPLETIONS_FALLBACK_REPLACE_ALL` set (to any value) to allow to
  replace all the zsh completions, even if we already have one for the given
  command.

* `ZSH_BASH_COMPLETIONS_FALLBACK_WHITELIST` an array of commands for which we
  want to enable the bash completions, this allow to filter the commands to use
  a bash completion for. Set it to a value such as `(gdbus zramctl)` to enable
  it only for the `gdbus` and `zramctl` commands.
  This also can be used with `$ZSH_BASH_COMPLETIONS_FALLBACK_REPLACE_ALL` to
  only use a subset of completions from bash only.

* `ZSH_BASH_COMPLETIONS_FALLBACK_BLACKLIST` an array of commands for which we
  want to disable the bash completions.

* `ZSH_BASH_COMPLETIONS_FALLBACK_REPLACE_LIST` an array of commands for which we
  want to give priority to the bash completions over the zsh ones.
  So, in case a zsh completion for such commands is available, we just ignore it
  and replace it with the bash ones.
  This has no effect if `$ZSH_BASH_COMPLETIONS_FALLBACK_REPLACE_ALL` is set.

* `ZSH_BASH_COMPLETIONS_FALLBACK_PRELOAD_ALL` set this variable (to any value)
  to always preload completions even for non-available commands. We don't do it
  by default and if any command is added at later times, the user can manually
  call `_bash_completions_load` (or source this file again)

* `ZSH_BASH_COMPLETIONS_FALLBACK_LAZYLOAD_DISABLE` set this variable (to any
  value) in order to disable the lazy loading of the completions at the fist
  time the tab-completion is triggered. By setting this the completions are
  loaded instead at startup.

* `ZSH_BASH_COMPLETIONS_FALLBACK_LOAD_NATIVE_COMPLETIONS` set this variable to
  a value that is different from `true` not to ask the bash for all its suported
  completions, but only relying in the provided completion files.

* `ZSH_BASH_COMPLETIONS_FALLBACK_LAZYLOAD_AUTO_UPDATE` set this variable (to any
  value) to automatically check for new completions and to install them at every
  tab-completion if the threshold from the last update set in
  `$ZSH_BASH_COMPLETIONS_FALLBACK_AUTO_UPDATE_THRESHOLD` has passed.
  This is not affected by the value of
  `$ZSH_BASH_COMPLETIONS_FALLBACK_LAZYLOAD_DISABLE` and it will work both in
  case lazy loading is enabled or not.

* `ZSH_BASH_COMPLETIONS_FALLBACK_AUTO_UPDATE_THRESHOLD`: Sets a threshold (in
  seconds) to check if the completions have been changed in case the lazy load
  update is enabled. This is set by default at 300 seconds.
