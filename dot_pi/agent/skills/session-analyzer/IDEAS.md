# Ideas & Future Improvements

## Worktree Support

**Problem:** Sessions are stored by absolute path, so git worktrees are treated as separate projects even though they share the same repo.

Example:

- `/path/to/myrepo` → `--path-to-myrepo--`
- `/path/to/myrepo-feature` → `--path-to-myrepo-feature--`

Patterns that span worktrees are missed entirely.

**Proposed Solution:** Add `--include-worktrees` flag that:

1. Detects if cwd is a git repo
2. Uses `git worktree list --porcelain` to find all worktrees
3. Merges sessions from all related worktree paths before analysis

```javascript
import { execSync } from "child_process";

function getWorktreePaths(cwd) {
    try {
        const output = execSync("git worktree list --porcelain", { cwd, encoding: "utf8" });
        return output
            .split("\n")
            .filter(line => line.startsWith("worktree "))
            .map(line => line.replace("worktree ", ""));
    } catch {
        return [cwd]; // Not a git repo or no worktrees
    }
}
```

**Workaround (current):** Run analyzer multiple times with same output dir:

```bash
./analyze.js /path/to/main-repo --output ./combined
./analyze.js /path/to/worktree --output ./combined
./analyze.js --analyze --output ./combined
```
