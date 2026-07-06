#!/usr/bin/env node

const USAGE = `Usage: reddit.js <command> [options]

Commands:
  search  "query"          Search all of Reddit
  top     <subreddit>      Top posts from a subreddit
  post    <url|post_id>    Fetch a post with top comments

Options:
  -n <count>     Number of results (default: 10, max: 100)
  -t <period>    Time period: hour, day, week, month, year, all (default: year)
  -s <sort>      Sort: relevance, hot, top, new, comments (default: top)
  -c <count>     Number of comments to show for 'post' command (default: 5)

Examples:
  reddit.js search "insider threat cybercrime" -n 10 -t year
  reddit.js top cybersecurity -t month -n 5
  reddit.js post "https://www.reddit.com/r/cybersecurity/comments/1rbnwlf"`;

const UA = "pi-agent:1.0 (by /u/pi-coding-agent)";

function parseArgs(argv) {
  const opts = { command: null, target: null, n: 10, t: "year", s: "top", c: 5 };
  const args = argv.slice(2);
  if (!args.length) { console.error(USAGE); process.exit(1); }
  opts.command = args[0];
  let i = 1;
  // Grab target (next non-flag arg)
  if (i < args.length && !args[i].startsWith("-")) {
    opts.target = args[i++];
  }
  while (i < args.length) {
    const flag = args[i];
    const val = args[i + 1];
    if (flag === "-n" && val) { opts.n = Math.min(parseInt(val, 10), 100); i += 2; }
    else if (flag === "-t" && val) { opts.t = val; i += 2; }
    else if (flag === "-s" && val) { opts.s = val; i += 2; }
    else if (flag === "-c" && val) { opts.c = parseInt(val, 10); i += 2; }
    else if (!opts.target) { opts.target = args[i]; i++; }
    else { i++; }
  }
  return opts;
}

async function reddit(url) {
  const sep = url.includes("?") ? "&" : "?";
  const fullUrl = `https://www.reddit.com${url}${sep}raw_json=1`;
  const res = await fetch(fullUrl, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`Reddit API ${res.status}: ${res.statusText}`);
  return res.json();
}

function truncate(str, len) {
  if (!str) return "";
  str = str.replace(/\n+/g, " ").trim();
  return str.length > len ? str.slice(0, len) + "…" : str;
}

function formatPost(p, i) {
  const lines = [];
  lines.push(`${i}. [${p.score}pts | ${p.num_comments} comments] ${p.title}`);
  lines.push(`   r/${p.subreddit} • u/${p.author} • ${new Date(p.created_utc * 1000).toISOString().slice(0, 10)}`);
  if (p.url && !p.is_self) {
    lines.push(`   Link: ${p.url}`);
  }
  lines.push(`   https://reddit.com${p.permalink}`);
  if (p.selftext) {
    lines.push(`   ${truncate(p.selftext, 300)}`);
  }
  return lines.join("\n");
}

async function cmdSearch(opts) {
  if (!opts.target) { console.error("Error: search requires a query string"); process.exit(1); }
  const params = new URLSearchParams({
    q: opts.target,
    sort: opts.s,
    t: opts.t,
    limit: String(opts.n),
  });
  const data = await reddit(`/search.json?${params}`);
  const posts = data.data.children;
  if (!posts.length) { console.log("No results found."); return; }
  posts.forEach((p, i) => console.log(formatPost(p.data, i + 1) + "\n"));
}

async function cmdTop(opts) {
  if (!opts.target) { console.error("Error: top requires a subreddit name"); process.exit(1); }
  const sub = opts.target.replace(/^r\//, "");
  const data = await reddit(`/r/${sub}/top.json?t=${opts.t}&limit=${opts.n}`);
  const posts = data.data.children;
  if (!posts.length) { console.log("No posts found."); return; }
  posts.forEach((p, i) => console.log(formatPost(p.data, i + 1) + "\n"));
}

async function cmdPost(opts) {
  if (!opts.target) { console.error("Error: post requires a URL or post path"); process.exit(1); }
  // Extract path from full URL or use as-is
  let path = opts.target;
  if (URL.canParse(path)) path = new URL(path).pathname;
  // Ensure path ends cleanly
  path = path.replace(/\/$/, "");

  const data = await reddit(`${path}.json?limit=${opts.c}&sort=top`);
  const post = data[0].data.children[0].data;

  console.log(`# ${post.title}`);
  console.log(`r/${post.subreddit} • u/${post.author} • ${new Date(post.created_utc * 1000).toISOString().slice(0, 10)}`);
  console.log(`Score: ${post.score} | Comments: ${post.num_comments} | Upvote ratio: ${post.upvote_ratio}`);
  if (post.url && !post.is_self) {
    console.log(`Link: ${post.url}`);
  }
  console.log(`https://reddit.com${post.permalink}`);
  if (post.selftext) {
    console.log(`\n${truncate(post.selftext, 1000)}`);
  }

  const comments = data[1].data.children.filter(c => c.kind === "t1");
  if (comments.length) {
    console.log(`\n--- Top ${comments.length} comments ---\n`);
    comments.forEach((c, i) => {
      const d = c.data;
      console.log(`${i + 1}. [${d.score}pts] u/${d.author}`);
      console.log(`   ${truncate(d.body, 400)}\n`);
    });
  }
}

const opts = parseArgs(process.argv);
try {
  if (opts.command === "search") await cmdSearch(opts);
  else if (opts.command === "top") await cmdTop(opts);
  else if (opts.command === "post") await cmdPost(opts);
  else { console.error(`Unknown command: ${opts.command}\n\n${USAGE}`); process.exit(1); }
} catch (e) {
  console.error(`Error: ${e.message}`);
  process.exit(1);
}
