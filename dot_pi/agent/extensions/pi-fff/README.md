# pi-fff

[![pi-fff demo](https://github.com/user-attachments/assets/c9020bb7-f708-4f75-a802-6ac182b48e07)](https://github.com/user-attachments/assets/1a9fc348-19bc-489b-9de9-bb329728d234)

`pi-fff` is a [pi](https://github.com/mariozechner/pi) extension that brings fast fuzzy file finding and indexed content search into the editor, built-in tools, and agent workflows.

It is powered by [`@ff-labs/fff-node`](https://www.npmjs.com/package/@ff-labs/fff-node) and gives pi a much better project-navigation experience.

## What problem it solves

When working in a real codebase, agents and humans rarely know the exact path they need.

Instead of requiring exact file paths or repeated shell exploration, `pi-fff` lets pi:

- autocomplete fuzzy `@...` file references in the editor
- resolve approximate paths before `read`
- search code content with FFF-backed `grep`
- expose dedicated search tools for agents
- surface better ranked results and read suggestions

In short: it makes “find the right file fast” a first-class part of pi.

## What the package adds to pi

`pi-fff` integrates at four levels.

### 1. Editor autocomplete

Type things like:

```text
@readme
@src/index
@"folder with spaces/file"
```

`pi-fff` will offer ranked file suggestions from the current project.

### 2. Built-in tool upgrades

The extension overrides pi’s built-in tools to make them FFF-aware.

#### `read`

- accepts approximate file paths
- resolves fuzzy paths before reading
- supports `@path`-style input
- uses location hints from FFF when available

#### `grep`

- uses FFF-backed indexed content search
- supports fuzzy path or folder scopes
- pushes scope and glob filters down into native FFF constraints when possible
- returns more agent-friendly results
- falls back to pi’s built-in grep for compatibility edge cases

### 3. Custom agent tools

The extension also registers explicit tools for exploration and search:

- `find_files`
- `resolve_file`
- `related_files`
- `fff_grep`
- `fff_multi_grep`

These are useful when the agent wants to browse candidates first instead of immediately reading one guessed file.

### 4. Status and maintenance commands

Slash commands are included for feature flags, status, and manual recovery.

- `/fff-features`
- `/fff-status`
- `/reindex-fff`

## How search and indexing work

`pi-fff` creates an FFF runtime for the current pi session.

That runtime:

1. indexes the current project on startup
2. keeps a background file watcher running
3. updates search results automatically as the project changes

So in normal use, indexing is automatic.

### Do I need to reindex manually?

Usually, no.

`/reindex-fff` is mainly a fallback for cases like:

- very large branch switches
- mass file renames
- generated file churn
- stale results after watcher hiccups

Think of it as “force a fresh rescan if the index looks stale,” not something you should need after every edit.

## What the agent gets

When active, `pi-fff` helps the agent work more efficiently by making it easier to:

- discover files related to a topic
- turn vague file references into exact paths
- search code with better ranking and constraints
- move from search results to a likely file to read next
- continue paginated searches with cursors

This reduces blind `bash` exploration and makes tool use more deliberate.

## Search behavior highlights

### Ranked file resolution

A vague query like:

```text
editor
```

can resolve to the best matching file, or return ranked candidates if the result is ambiguous.

### Better grep output

FFF grep output can include:

- a suggested file to read next
- definition-like matches near the top
- expanded context for likely definitions
- cursors for pagination

### Multi-pattern content search

Use `fff_multi_grep` when you want to search for multiple literal variants at once, for example renamed symbols or aliases.

## Commands

### `/fff-features`

Interactive feature toggle UI.

- Space toggles the selected row
- Enter saves
- Esc cancels
- State is stored globally in:
  - `~/.pi/agent/extensions/pi-fff.json`

### `/fff-status`

Shows:

- runtime state
- indexed file count
- repository detection
- current feature flags

### `/reindex-fff`

Forces a rescan of the current project if the automatic watcher missed something.

## Installation

### From npm

```bash
pi install npm:pi-fff
```

### From git

```bash
pi install git+https://github.com/ShpetimA/pi-fff.git
```

Restart pi after installation.

## Development

```bash
npm install
npm run typecheck
npm test
```

## Package metadata

```json
{
  "pi": {
    "extensions": ["./index.ts"]
  }
}
```

## Summary

`pi-fff` makes pi better at file discovery, fuzzy path resolution, and indexed code search.

If pi is active inside a repo, `pi-fff` helps both the editor and the agent get to the right file faster.

See [PLAN.md](./PLAN.md) for implementation notes and next steps.
