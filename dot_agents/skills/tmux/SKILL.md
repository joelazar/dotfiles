---
name: tmux
description: "Drive interactive CLIs (Python REPL, lldb, gdb, psql, node, ssh sessions, etc.) from a coding agent by running them inside tmux and scraping pane output. Use when you need to keep a long-running interactive process alive across tool calls, step through a debugger, or send keystrokes to a TTY program that doesn't fit the usual one-shot command model."
license: Vibecoded
---

# tmux Skill

Use tmux as a programmable terminal multiplexer so you can start an interactive program once, send it keystrokes over many turns, and read back what it printed. Works on Linux and macOS with stock tmux. Isolate from the user's personal tmux by running on a private socket with no config file.

## Quickstart (isolated socket)

```bash
SOCKET_DIR="${AGENT_TMUX_SOCKET_DIR:-${TMPDIR:-/tmp}/agent-tmux-sockets}"
mkdir -p "$SOCKET_DIR"
SOCKET="$SOCKET_DIR/agent.sock"        # private socket, separate from the user's tmux
SESSION=py-repl                        # slug-like name, no spaces
tmux -S "$SOCKET" new -d -s "$SESSION" -n shell
tmux -S "$SOCKET" send-keys -t "$SESSION":0.0 -- 'python3 -q' Enter
tmux -S "$SOCKET" capture-pane -p -J -t "$SESSION":0.0 -S -200
tmux -S "$SOCKET" kill-session -t "$SESSION"
```

## Tell the user how to watch

Right after starting a session, print a copy-pasteable monitor snippet so the user can follow along. Print it again at the end of the tool loop in case they missed it. The earlier you send it, the better.

```
To watch this session live:
  tmux -S "$SOCKET" attach -t py-repl

Or grab a snapshot:
  tmux -S "$SOCKET" capture-pane -p -J -t py-repl:0.0 -S -200
```

## Socket convention

Keep all agent-owned sockets under one directory so they are easy to list and clean up:

- Directory: `AGENT_TMUX_SOCKET_DIR` if set, otherwise `${TMPDIR:-/tmp}/agent-tmux-sockets`.
- Default socket path: `$SOCKET_DIR/agent.sock`.
- Always pass `-S "$SOCKET"` (path). `-L` is for socket *names* under the default tmux dir and will not find these sockets.
- If the user's tmux config interferes, add `-f /dev/null` for a clean config. Drop that flag if you actually want their config loaded.

Create the dir before first use: `mkdir -p "$SOCKET_DIR"`.

## Targeting panes

Target format is `{session}:{window}.{pane}` and defaults to `:0.0` when omitted. Pick short slug names like `py-repl`, `lldb-main`, or `psql-staging` so targets stay readable.

Useful inspections:

```bash
tmux -S "$SOCKET" list-sessions
tmux -S "$SOCKET" list-panes -a
```

## Finding sessions

List sessions on the active socket, with optional filter:

```bash
./scripts/find-sessions.sh -S "$SOCKET"
./scripts/find-sessions.sh -S "$SOCKET" -q py   # filter by substring
```

Scan every socket under the shared directory:

```bash
./scripts/find-sessions.sh --all
```

## Sending input safely

Shell expansion inside `send-keys` is the usual source of surprises. Two safe patterns:

- Literal send, no expansion: `tmux -S "$SOCKET" send-keys -t "$TARGET" -l -- "$cmd"`, then a separate `Enter`.
- Inline command with quoting: `tmux -S "$SOCKET" send-keys -t "$TARGET" -- $'python3 -m http.server 8000' Enter`.

Control keys use tmux's symbolic names: `C-c`, `C-d`, `C-z`, `Escape`, `Tab`, `PageUp`, and so on.

## Watching output

Grab recent history with wrapping joined so long lines read correctly:

```bash
tmux -S "$SOCKET" capture-pane -p -J -t "$TARGET" -S -200
```

For continuous monitoring, poll with `wait-for-text.sh` (below). `tmux wait-for` is a different tool and does not watch pane output. You can also attach to watch live: `tmux -S "$SOCKET" attach -t "$SESSION"`, then detach with `Ctrl+b d`.

When giving the user instructions, always spell out the exact monitor command. Don't assume they remember it from earlier in the conversation.

## Waiting for prompts

Interactive tools print a prompt before they are ready for input. Racing that prompt leads to dropped keystrokes. Poll for the prompt first:

```bash
./scripts/wait-for-text.sh -t "$SESSION":0.0 -p '^>>>' -T 15 -l 4000
```

The same pattern works for completion markers on long-running commands: poll for text like `"Program exited"` or `"Type quit to exit"` before sending the next instruction.

## Interactive tool recipes

Python REPL:

```bash
tmux -S "$SOCKET" send-keys -t "$TARGET" -- 'PYTHON_BASIC_REPL=1 python3 -q' Enter
./scripts/wait-for-text.sh -t "$TARGET" -p '^>>>' -T 10
tmux -S "$SOCKET" send-keys -t "$TARGET" -l -- 'import sys; print(sys.version)'
tmux -S "$SOCKET" send-keys -t "$TARGET" Enter
```

`PYTHON_BASIC_REPL=1` is important: the default Python 3.13+ REPL emits escape sequences and prompt-toolkit-style edits that break `send-keys` input. The basic REPL behaves like a plain TTY.

Debuggers:

- Prefer `lldb` when the user hasn't specified, since it works out of the box on macOS and recent Linux.
- `gdb --quiet ./a.out`, then `set pagination off` so captures aren't truncated by `--More--` prompts.
- Interrupt a running program with `C-c`. Quit with `quit` (gdb asks for confirmation; send `y`).

Other TTY apps (ipdb, psql, mysql, node, bash subshells, ssh): same shape. Start the program, poll for its prompt, send literal text plus `Enter`, capture output.

## Cleanup

```bash
# one session
tmux -S "$SOCKET" kill-session -t "$SESSION"

# every session on this socket
tmux -S "$SOCKET" list-sessions -F '#{session_name}' \
  | xargs -r -n1 tmux -S "$SOCKET" kill-session -t

# nuke the whole private server
tmux -S "$SOCKET" kill-server
```

## Helper: wait-for-text.sh

`./scripts/wait-for-text.sh` polls a pane for a regex (or fixed string) with a timeout. Bash + tmux + grep, works on Linux and macOS.

```bash
./scripts/wait-for-text.sh -t session:0.0 -p 'pattern' [-F] [-T 20] [-i 0.5] [-l 2000]
```

Flags:

- `-t` / `--target`: pane target (required)
- `-p` / `--pattern`: regex to match (required); `-F` switches to fixed-string match
- `-T`: timeout seconds (integer, default 15)
- `-i`: poll interval seconds (default 0.5)
- `-l`: history lines to search (integer, default 1000)

Exits 0 on first match, 1 on timeout. On timeout it prints the last captured text to stderr, which is usually enough to see what went wrong (wrong prompt regex, program crashed before printing the prompt, etc.).
