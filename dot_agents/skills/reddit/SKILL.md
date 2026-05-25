---
name: reddit
description: Search Reddit and browse subreddit posts using the public JSON API. Use when you need to find Reddit discussions, community reactions, or story leads from specific subreddits.
---

# Reddit

Search Reddit, browse subreddit top posts, and read individual posts with comments. No API key required.

## Tool

Use `reddit.js` from this skill directory:

```bash
node reddit.js <command> [options]
```

## Commands

### Search all of Reddit
```bash
reddit.js search "query" [-n count] [-t period] [-s sort]
```

### Top posts from a subreddit
```bash
reddit.js top <subreddit> [-n count] [-t period]
```

### Read a post with top comments
```bash
reddit.js post <url> [-c comment_count]
```

## Options

| Flag | Default | Values |
|------|---------|--------|
| `-n` | 10 | Number of results (max 100) |
| `-t` | year | `hour`, `day`, `week`, `month`, `year`, `all` |
| `-s` | top | `relevance`, `hot`, `top`, `new`, `comments` |
| `-c` | 5 | Number of comments to show |

## Output

Each post shows: score, comment count, title, subreddit, author, date, link, and a text preview. The `post` command additionally shows top comments with scores.

## Notes

- **Rate limiting**: Reddit rate-limits unauthenticated requests. Add a small delay between rapid successive calls if needed.
- **Search relevance**: Global search can be noisy. Subreddit-specific `top` browsing tends to surface better results for niche research.
- **Subreddit names**: Pass without the `r/` prefix (e.g., `cybersecurity` not `r/cybersecurity`).
