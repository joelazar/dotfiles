import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  async function doCommit() {
    const [status, diff, branch, log] = await Promise.all([
      pi.exec("git", ["status"]),
      pi.exec("git", ["diff", "HEAD"]),
      pi.exec("git", ["branch", "--show-current"]),
      pi.exec("git", ["log", "--pretty=format:%s", "-20"]),
    ]);

    const prompt = `## Context

- Current git status:
\`\`\`
${status.stdout.trim()}
\`\`\`

- Current git diff (staged and unstaged changes):
\`\`\`
${diff.stdout.trim()}
\`\`\`

- Current branch: ${branch.stdout.trim()}

- Recent commits for style reference:
\`\`\`
${log.stdout.trim()}
\`\`\`

## Your task

Based on the above changes, create a single git commit.

**IMPORTANT**: Before creating the commit message:
1. Examine the recent commits to understand the commit message style and conventions used in this repository
2. Follow the EXACT same format, emoji usage, capitalization, and structure as the recent commits
3. Use appropriate gitmoji or emoji prefix if the repository uses them (e.g., :sparkles:, :wrench:, :bug:, :fire:, :recycle:)

You have the capability to call multiple tools in a single response. Stage and create the commit using a single message. Do not use any other tools or do anything else. Do not send any other text or messages besides these tool calls.`;

    pi.sendUserMessage(prompt);
  }

  pi.registerCommand("commit", {
    description: "Create a git commit",
    handler: async (_args, _ctx) => {
      await doCommit();
    },
  });

  pi.registerShortcut("ctrl+shift+c", {
    description: "Create a git commit",
    handler: async (_ctx) => {
      await doCommit();
    },
  });
}
