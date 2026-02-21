---
name: github
description: "Interact with GitHub using the `gh` CLI. Use `gh issue`, `gh pr`, `gh run`, `gh search`, and `gh api` for issues, PRs, CI runs, search, and advanced queries."
---

# GitHub Skill

Use the `gh` CLI to interact with GitHub. Always specify `--repo owner/repo` when not in a git directory, or use URLs directly.

## Searching Issues & PRs

Search for existing issues before creating duplicates:
```bash
# Search issues in a specific repo
gh search issues "vim visual mode" --repo zed-industries/zed --limit 10

# Search with state filter
gh search issues "search results" --repo zed-industries/zed --state open

# Search with labels
gh search issues "bug" --repo owner/repo --label "vim"

# Search PRs
gh search prs "fix vim" --repo zed-industries/zed --state open
```

Advanced search qualifiers (same as GitHub web search):
```bash
# Issues mentioning specific text in title
gh search issues "in:title project search vim" --repo zed-industries/zed

# Issues by author or assignee
gh search issues "author:username" --repo owner/repo
gh search issues "assignee:username" --repo owner/repo

# Combine qualifiers
gh search issues "vim visual mode in:title,body state:open" --repo zed-industries/zed
```

## Issues

List issues:
```bash
gh issue list --repo owner/repo
gh issue list --repo owner/repo --state open --label "bug"
gh issue list --repo owner/repo --assignee @me
```

View an issue:
```bash
gh issue view 1234 --repo owner/repo
gh issue view 1234 --repo owner/repo --comments  # include comments
```

Create an issue:
```bash
gh issue create --repo owner/repo --title "Bug: ..." --body "Description..."
gh issue create --repo owner/repo --title "Bug" --body "Desc" --label "bug,vim"
```

## Pull Requests

Check CI status on a PR:
```bash
gh pr checks 55 --repo owner/repo
```

List PRs:
```bash
gh pr list --repo owner/repo
gh pr list --repo owner/repo --state open --author @me
```

View PR details:
```bash
gh pr view 55 --repo owner/repo
gh pr view 55 --repo owner/repo --comments
```

## CI/Workflow Runs

List recent workflow runs:
```bash
gh run list --repo owner/repo --limit 10
gh run list --repo owner/repo --workflow ci.yml  # specific workflow
```

View a run and see which steps failed:
```bash
gh run view <run-id> --repo owner/repo
```

View logs for failed steps only:
```bash
gh run view <run-id> --repo owner/repo --log-failed
```

Re-run failed jobs:
```bash
gh run rerun <run-id> --repo owner/repo --failed
```

## API for Advanced Queries

The `gh api` command is useful for accessing data not available through other subcommands.

Get PR with specific fields:
```bash
gh api repos/owner/repo/pulls/55 --jq '.title, .state, .user.login'
```

Search via API (more control):
```bash
gh api search/issues --method GET -f q="repo:zed-industries/zed vim visual mode" --jq '.items[] | "\(.number): \(.title)"'
```

Get repo info:
```bash
gh api repos/owner/repo --jq '.stargazers_count, .open_issues_count'
```

## JSON Output

Most commands support `--json` for structured output. Use `--jq` to filter:

```bash
gh issue list --repo owner/repo --json number,title --jq '.[] | "\(.number): \(.title)"'
gh pr list --repo owner/repo --json number,title,author --jq '.[] | "\(.number) by \(.author.login): \(.title)"'
```

## Common Workflows

**Check if an issue already exists before creating:**
```bash
gh search issues "your bug description" --repo owner/repo --state open
# If no results, create:
gh issue create --repo owner/repo --title "Bug: ..." --body "..."
```

**Find PRs that fix an issue:**
```bash
gh search prs "fixes #1234" --repo owner/repo
```

**Watch CI on your PR:**
```bash
gh pr checks 55 --repo owner/repo --watch
```
