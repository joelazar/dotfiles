---
name: perplexity-search
description: Web search, grounded answers, reasoning, and deep research via the Perplexity API.
allowed-tools: [Bash, Read]
---

# Perplexity Search

Use Perplexity when you want either:

- **raw web results** via the Search API, or
- **grounded AI answers** via Sonar models with citations.

## When to Use

- Find ranked search results without synthesis
- Get a grounded answer with citations
- Compare options or reason through a decision
- Run a deeper research pass on a topic

## Current models (verified April 2026)

| Model                 | Best for                                         |
| --------------------- | ------------------------------------------------ |
| `sonar`               | Fast grounded answers                            |
| `sonar-pro`           | Stronger synthesis for harder research questions |
| `sonar-reasoning-pro` | Reasoning-heavy decision support                 |
| `sonar-deep-research` | Exhaustive research                              |

Notes:

- `sonar-reasoning` was retired in late 2025. Use `sonar-reasoning-pro`.
- Raw search uses `POST https://api.perplexity.ai/search`.
- Chat-style grounded answers use `POST https://api.perplexity.ai/chat/completions`.

## Files

- `perplexity_search.py` — dependency-free CLI wrapper around the Perplexity API

Run commands from this skill directory:

```bash
cd ~/.agents/skills/perplexity-search
```

## Usage

### Quick grounded answer

```bash
python3 perplexity_search.py --ask "What is the latest Python release?"
```

### Direct web search

```bash
python3 perplexity_search.py \
  --search "SQLite graph database patterns" \
  --max-results 5 \
  --recency week
```

### Search with language, country, and date filters

```bash
python3 perplexity_search.py \
  --search "EU AI Act enforcement updates" \
  --languages en fr \
  --country FR \
  --after 01/01/2026 \
  --before 04/01/2026
```

### Synthesized research

```bash
python3 perplexity_search.py \
  --research "compare FastAPI vs Django for microservices"
```

### Reasoning-heavy answer

```bash
python3 perplexity_search.py \
  --reason "Should I use Neo4j or SQLite for a graph under 10k nodes?" \
  --reasoning-effort medium
```

### Deep research

```bash
python3 perplexity_search.py \
  --deep "state of AI agent observability 2026" \
  --reasoning-effort high
```

### Raw JSON

```bash
python3 perplexity_search.py --search "OpenTelemetry AI agents" --json
```

## Parameters

| Parameter    | Description                                                   |
| ------------ | ------------------------------------------------------------- |
| `--ask`      | Quick grounded answer using `sonar` by default                |
| `--search`   | Raw ranked search results via the Search API                  |
| `--research` | Synthesized answer using `sonar-pro` by default               |
| `--reason`   | Reasoning-heavy answer using `sonar-reasoning-pro` by default |
| `--deep`     | Deep research using `sonar-deep-research` by default          |
| `--model`    | Override the default chat model                               |
| `--json`     | Print raw API JSON                                            |
| `--timeout`  | HTTP timeout in seconds                                       |

### Search options

| Parameter               | Description                                                         |
| ----------------------- | ------------------------------------------------------------------- |
| `--max-results N`       | Number of results, `1-20`                                           |
| `--recency`             | `day`, `week`, `month`, `year`                                      |
| `--domains`             | Restrict to domains; prefix with `-` to exclude, e.g. `-reddit.com` |
| `--languages`           | Language filter using ISO 639-1 codes, e.g. `en fr de`              |
| `--country`             | Country bias using ISO 3166-1 alpha-2, e.g. `US`                    |
| `--after`               | Only include results after a date, `MM/DD/YYYY`                     |
| `--before`              | Only include results before a date, `MM/DD/YYYY`                    |
| `--max-tokens-per-page` | Per-page extraction budget for richer snippets                      |

### Chat-model options

| Parameter            | Description                                             |
| -------------------- | ------------------------------------------------------- |
| `--reasoning-effort` | `minimal`, `low`, `medium`, `high` for supported models |

## Mode guide

| Need                                      | Use          |
| ----------------------------------------- | ------------ |
| Quick fact with grounding                 | `--ask`      |
| Find sources only                         | `--search`   |
| Summarized answer                         | `--research` |
| Compare options / think through tradeoffs | `--reason`   |
| Comprehensive research pass               | `--deep`     |

## API key

Requires `PERPLEXITY_API_KEY` in the environment.

## Validation

This skill was updated to remove the old `aiohttp` dependency, so it now runs with plain `python3` out of the box.
