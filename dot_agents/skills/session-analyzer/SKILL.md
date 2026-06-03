---
disable-model-invocation: true
name: session-analyzer
description: Analyze coding-agent session transcripts to discover patterns that could become AGENTS.md rules, skills, or prompt templates. Mines your usage history for automation opportunities across local coding-agent tools.
---

# Session Analyzer

Extracts and analyzes your coding-agent session transcripts to find recurring patterns that could be automated.

## Usage

```bash
# Extract transcripts for current directory
{baseDir}/analyze.js

# Extract transcripts for specific directory
{baseDir}/analyze.js /path/to/project

# Match multiple dirs by pattern (worktrees, variants, etc.)
{baseDir}/analyze.js --pattern orders-app

# Extract + analyze with helper agents / parallel analyzers
{baseDir}/analyze.js --analyze

# Pattern + analyze (finds all matching session dirs)
{baseDir}/analyze.js --pattern orders-app --analyze

# Custom output directory
{baseDir}/analyze.js --output ./my-analysis --analyze
```

## What It Does

1. **Extract**: Reads all session files for the given working directory from the configured transcript source(s)
   - Today this is primarily set up around pi transcripts, but the skill should be described and used in an agent-neutral way
   - Use `--pattern` to match multiple directories (e.g., worktrees, feature branches)
2. **Split**: Chunks transcripts into ~100k char files (fits in context window)
3. **Analyze** (optional): Spawns helper agents / parallel analysis runs to identify:
   - **AGENTS.md patterns**: Coding style rules, conventions you repeat
   - **Skill patterns**: Multi-step workflows you do often
   - **Prompt templates**: Reusable prompts for common tasks

## Output

Without `--analyze`:

```
session-transcripts/
├── session-transcripts-000.txt
├── session-transcripts-001.txt
└── ...
```

With `--analyze`:

```
session-transcripts/
├── session-transcripts-000.txt
├── session-transcripts-000.summary.txt  # Pattern analysis
├── session-transcripts-001.txt
├── session-transcripts-001.summary.txt
└── FINAL-SUMMARY.txt                    # Aggregated findings
```

## Setup

Install dependencies (run once):

```bash
cd {baseDir}
npm install
```

## When to Use

- After working on a project for a while, to discover what rules/skills would help
- Periodically to find new automation opportunities
- When you notice you keep giving similar instructions

---

_Adapted from [badlogic/pi-mono gist](https://gist.github.com/badlogic/55d996b4afc4bd084ce55bb8ddd34594)_
