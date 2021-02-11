# nvm plugin

This plugin adds autocompletions for [nvm](https://github.com/nvm-sh/nvm) — a Node.js version manager.
It also automatically sources nvm, so you don't need to do it manually in your `.zshrc`.

To use it, add `nvm` to the plugins array of your zshrc file:

```zsh
plugins=(... nvm)
```

## Settings

If you installed nvm in a directory other than `$HOME/.nvm`, set and export `NVM_DIR` to be the directory
where you installed nvm.

These settings should go in your zshrc file, before Oh My Zsh is sourced:

- **`NVM_HOMEBREW`**: if you installed nvm via Homebrew, in a directory other than `/usr/local/opt/nvm`, you
  can set `NVM_HOMEBREW` to be the directory where you installed it.

- **`NVM_LAZY`**: if you want the plugin to defer the load of nvm to speed-up the start of your zsh session,
  set `NVM_LAZY` to `1`. This will use the `--no-use` parameter when loading nvm, and will create a function
  for `node`, `npm` and `yarn`, so when you call either of these three, nvm will load with `nvm use default`.

- **`NVM_AUTOLOAD`**: if `NVM_AUTOLOAD` is set to `1`, the plugin will automatically load a node version when
  if finds a [`.nvmrc` file](https://github.com/nvm-sh/nvm#nvmrc) in the current working directory indicating
  which node version to load.
