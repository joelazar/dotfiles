/**
 * Custom commands converted from Claude Code commands
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  // Address PR comments
  pi.registerCommand("address-comments", {
    description: "Get GitHub PR and address all non-resolved comments",
    handler: async (_args, ctx) => {
      pi.sendUserMessage(
        `Get the GitHub pull request of the actual branch and address all non-resolved comments on the pull request.

After this, wait for my confirmation, and if I confirm, commit and push the changes.`,
      );
    },
  });

  // Catchup - read changed code
  pi.registerCommand("catchup", {
    description:
      "Read all changed code in current branch compared to default branch",
    handler: async (_args, ctx) => {
      pi.sendUserMessage(
        `Read all changed code in the current branch compared to default branch.`,
      );
    },
  });

  // Double-check work
  pi.registerCommand("double-check", {
    description: "Double-check recent work and look for edge cases",
    handler: async (_args, ctx) => {
      pi.sendUserMessage(
        `Can you double-check the work you just did and look for edge cases?`,
      );
    },
  });

  // Explain codebase
  pi.registerCommand("explain-codebase", {
    description: "Scan and explain the whole codebase",
    handler: async (_args, ctx) => {
      pi.sendUserMessage(
        `Scan the whole codebase and explain it to me in an easy way that allows me to understand how it functions and how everything is connected.`,
      );
    },
  });

  // Search web
  pi.registerCommand("search-web", {
    description: "Search the web for given query",
    handler: async (args, ctx) => {
      if (!args || args.trim() === "") {
        ctx.ui.notify("Usage: /search-web <query>", "error");
        return;
      }
      pi.sendUserMessage(
        `Search the web for this: ${args} and get the most relevant information that answers my queries.`,
      );
    },
  });

  // Clean gone branches
  pi.registerCommand("clean-gone", {
    description: "Clean up git branches marked as [gone] (deleted on remote)",
    handler: async (_args, ctx) => {
      pi.sendUserMessage(
        `## Your Task

You need to execute the following bash commands to clean up stale local branches that have been deleted from the remote repository.

## Commands to Execute

1. **First, list branches to identify any with [gone] status**
   Execute this command:
   \`\`\`bash
   git branch -v
   \`\`\`

   Note: Branches with a '+' prefix have associated worktrees and must have their worktrees removed before deletion.

2. **Next, identify worktrees that need to be removed for [gone] branches**
   Execute this command:
   \`\`\`bash
   git worktree list
   \`\`\`

3. **Finally, remove worktrees and delete [gone] branches (handles both regular and worktree branches)**
   Execute this command:
   \`\`\`bash
   # Process all [gone] branches, removing '+' prefix if present
   git branch -v | grep '\\[gone\\]' | sed 's/^[+* ]//' | awk '{print $1}' | while read branch; do
     echo "Processing branch: $branch"
     # Find and remove worktree if it exists
     worktree=$(git worktree list | grep "\\\\[$branch\\\\]" | awk '{print $1}')
     if [ ! -z "$worktree" ] && [ "$worktree" != "$(git rev-parse --show-toplevel)" ]; then
       echo "  Removing worktree: $worktree"
       git worktree remove --force "$worktree"
     fi
     # Delete the branch
     echo "  Deleting branch: $branch"
     git branch -D "$branch"
   done
   \`\`\`

## Expected Behavior

After executing these commands, you will:

- See a list of all local branches with their status
- Identify and remove any worktrees associated with [gone] branches
- Delete all branches marked as [gone]
- Provide feedback on which worktrees and branches were removed

If no branches are marked as [gone], report that no cleanup was needed.`,
      );
    },
  });

  // Commit, push, and create PR
  pi.registerCommand("commit-push-pr", {
    description: "Commit, push, and open a PR",
    handler: async (_args, ctx) => {
      pi.sendUserMessage(
        `## Context

- Current git status: \`git status\`
- Current git diff (staged and unstaged changes): \`git diff HEAD\`
- Current branch: \`git branch --show-current\`

## Your task

Based on the above changes:

1. Create a new branch if on main
2. Create a single commit with an appropriate message
3. Push the branch to origin
4. Create a pull request using \`gh pr create\`
5. You have the capability to call multiple tools in a single response. You MUST do all of the above in a single message. Do not use any other tools or do anything else. Do not send any other text or messages besides these tool calls.`,
      );
    },
  });

  // Commit
  pi.registerCommand("commit", {
    description: "Create a git commit",
    handler: async (_args, ctx) => {
      pi.sendUserMessage(
        `## Context

- Current git status: \`git status\`
- Current git diff (staged and unstaged changes): \`git diff HEAD\`
- Current branch: \`git branch --show-current\`
- Recent commits: \`git log --oneline -10\`

## Your task

Based on the above changes, create a single git commit.

You have the capability to call multiple tools in a single response. Stage and create the commit using a single message. Do not use any other tools or do anything else. Do not send any other text or messages besides these tool calls.`,
      );
    },
  });
}
