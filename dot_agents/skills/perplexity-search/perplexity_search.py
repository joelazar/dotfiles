#!/usr/bin/env python3
"""Perplexity AI Search - web search, research, and reasoning via Perplexity API.

Current model lineup verified against Perplexity docs/changelog in April 2026:
- sonar
- sonar-pro
- sonar-reasoning-pro
- sonar-deep-research

Notes:
- `sonar-reasoning` was retired in late 2025; use `sonar-reasoning-pro`.
- Direct raw web search uses POST https://api.perplexity.ai/search.
- OpenAI-compatible chat completions remain available at
  POST https://api.perplexity.ai/chat/completions.

This script intentionally uses only the Python standard library so it works out of
box in skill directories without requiring aiohttp.
"""

import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

CHAT_URL = "https://api.perplexity.ai/chat/completions"
SEARCH_URL = "https://api.perplexity.ai/search"
DEFAULT_TIMEOUT_SECONDS = 180

MODELS = {
    "sonar": "sonar",
    "sonar-pro": "sonar-pro",
    "sonar-reasoning-pro": "sonar-reasoning-pro",
    "sonar-deep-research": "sonar-deep-research",
}


def load_api_key() -> str:
    """Load API key from environment or ~/.claude/.env."""
    api_key = os.environ.get("PERPLEXITY_API_KEY", "")

    if not api_key:
        # Try loading from ~/.claude/.env
        env_file = Path.home() / ".claude" / ".env"
        if env_file.exists():
            with open(env_file) as f:
                for line in f:
                    line = line.strip()
                    if line.startswith("PERPLEXITY_API_KEY="):
                        api_key = line.split("=", 1)[1].strip().strip('"').strip("'")
                        break

    return api_key


def parse_args():
    """Parse CLI arguments."""
    parser = argparse.ArgumentParser(
        description="AI search via Perplexity API",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Models:
  sonar                 Lightweight search with grounding
  sonar-pro             Advanced search for complex queries
  sonar-reasoning-pro   Reasoning-heavy grounded answers
  sonar-deep-research   Exhaustive research

Examples:
  %(prog)s --ask "What is MCP?"
  %(prog)s --search "SQLite recursive CTE examples" --recency month
  %(prog)s --research "best practices for AI agent logging 2026"
  %(prog)s --reason "Neo4j vs SQLite for a graph under 10k nodes"
  %(prog)s --deep "comprehensive guide to OpenTelemetry for AI agents"
        """,
    )

    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--ask", metavar="QUERY", help="Quick question with AI answer (defaults to sonar)")
    group.add_argument("--search", metavar="QUERY", help="Direct web search with ranked results")
    group.add_argument("--research", metavar="QUERY", help="AI-synthesized research (defaults to sonar-pro)")
    group.add_argument("--reason", metavar="QUERY", help="Reasoning-heavy answer (defaults to sonar-reasoning-pro)")
    group.add_argument("--deep", metavar="QUERY", help="Deep research report (defaults to sonar-deep-research)")

    parser.add_argument("--max-results", type=int, default=10, help="Max results for --search (1-20, default: 10)")
    parser.add_argument("--recency", choices=["day", "week", "month", "year"], help="Recency filter for --search")
    parser.add_argument("--domains", nargs="+", help="Restrict --search to specific domains; prefix with '-' to exclude")
    parser.add_argument("--languages", nargs="+", help="Language filter for --search using ISO 639-1 codes, e.g. en fr de")
    parser.add_argument("--country", help="Country bias for --search using ISO 3166-1 alpha-2, e.g. US")
    parser.add_argument("--after", help="Only include results after this date (MM/DD/YYYY)")
    parser.add_argument("--before", help="Only include results before this date (MM/DD/YYYY)")
    parser.add_argument("--max-tokens-per-page", type=int, help="Search API content extraction budget per result page")
    parser.add_argument("--timeout", type=int, default=DEFAULT_TIMEOUT_SECONDS, help=f"HTTP timeout in seconds (default: {DEFAULT_TIMEOUT_SECONDS})")
    parser.add_argument(
        "--reasoning-effort",
        choices=["minimal", "low", "medium", "high"],
        help="Optional reasoning effort for supported chat models (useful for --reason/--deep)",
    )
    parser.add_argument("--model", choices=list(MODELS.keys()), help="Override the default model for chat modes")
    parser.add_argument("--json", action="store_true", help="Print raw JSON response")

    args_to_parse = [arg for arg in sys.argv[1:] if not arg.endswith(".py")]
    args = parser.parse_args(args_to_parse)

    if not 1 <= args.max_results <= 20:
        parser.error("--max-results must be between 1 and 20")
    if args.languages and len(args.languages) > 10:
        parser.error("--languages accepts at most 10 codes")

    return args


def post_json(url: str, payload: dict, timeout_seconds: int) -> dict:
    """POST JSON and return parsed JSON response."""
    api_key = load_api_key()
    if not api_key:
        return {"error": "PERPLEXITY_API_KEY not found in environment or ~/.claude/.env"}

    request = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=timeout_seconds) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        return {"error": f"API error {exc.code}: {body}"}
    except urllib.error.URLError as exc:
        return {"error": f"Network error: {exc.reason}"}
    except json.JSONDecodeError as exc:
        return {"error": f"Invalid JSON response: {exc}"}


def chat_query(query: str, model: str = "sonar", timeout_seconds: int = DEFAULT_TIMEOUT_SECONDS, reasoning_effort: str | None = None) -> dict:
    """Make request to /chat/completions endpoint."""
    payload = {"model": model, "messages": [{"role": "user", "content": query}]}
    if reasoning_effort:
        payload["reasoning_effort"] = reasoning_effort

    result = post_json(CHAT_URL, payload, timeout_seconds)
    if "error" in result:
        return result

    answer = ""
    citations = result.get("citations", [])
    if result.get("choices"):
        answer = result["choices"][0].get("message", {}).get("content", "")

    return {
        "answer": answer,
        "citations": citations,
        "model": result.get("model", model),
        "usage": result.get("usage", {}),
        "raw": result,
    }


def search_query(
    query: str,
    max_results: int = 10,
    recency: str | None = None,
    domains: list[str] | None = None,
    languages: list[str] | None = None,
    country: str | None = None,
    after: str | None = None,
    before: str | None = None,
    max_tokens_per_page: int | None = None,
    timeout_seconds: int = DEFAULT_TIMEOUT_SECONDS,
) -> dict:
    """Make request to /search endpoint (direct ranked results)."""
    payload = {"query": query, "max_results": max_results}
    if recency:
        payload["search_recency_filter"] = recency
    if domains:
        payload["search_domain_filter"] = domains
    if languages:
        payload["search_language_filter"] = [code.lower() for code in languages]
    if country:
        payload["country"] = country.upper()
    if after:
        payload["search_after_date_filter"] = after
    if before:
        payload["search_before_date_filter"] = before
    if max_tokens_per_page is not None:
        payload["max_tokens_per_page"] = max_tokens_per_page

    result = post_json(SEARCH_URL, payload, timeout_seconds)
    if "error" in result:
        return result

    return {
        "results": result.get("results", []),
        "id": result.get("id", ""),
        "server_time": result.get("server_time"),
        "raw": result,
    }


def main():
    args = parse_args()

    if args.search:
        query = args.search
        print(f"Searching: {query}")
        if args.recency:
            print(f"  Recency: {args.recency}")
        if args.domains:
            print(f"  Domains: {', '.join(args.domains)}")

        if args.languages:
            print(f"  Languages: {', '.join(code.lower() for code in args.languages)}")
        if args.country:
            print(f"  Country: {args.country.upper()}")
        if args.after:
            print(f"  After: {args.after}")
        if args.before:
            print(f"  Before: {args.before}")

        result = search_query(
            query,
            max_results=args.max_results,
            recency=args.recency,
            domains=args.domains,
            languages=args.languages,
            country=args.country,
            after=args.after,
            before=args.before,
            max_tokens_per_page=args.max_tokens_per_page,
            timeout_seconds=args.timeout,
        )

        if result.get("error"):
            print(f"\n❌ Error: {result['error']}")
            sys.exit(1)

        if args.json:
            print(json.dumps(result["raw"], indent=2, ensure_ascii=False))
            return

        results = result.get("results", [])
        print(f"\n✓ Found {len(results)} results\n")

        for i, r in enumerate(results, 1):
            title = r.get("title", "No title")
            url = r.get("url", "")
            snippet = (r.get("snippet", "") or "").strip()
            date = r.get("date", "")

            print(f"{i}. {title}")
            if url:
                print(f"   {url}")
            if date:
                print(f"   Date: {date}")
            if snippet:
                print(f"   {snippet[:240]}{'...' if len(snippet) > 240 else ''}")
            print()
        return

    if args.ask:
        query = args.ask
        model = args.model or "sonar"
        mode = "Ask"
    elif args.research:
        query = args.research
        model = args.model or "sonar-pro"
        mode = "Research"
    elif args.reason:
        query = args.reason
        model = args.model or "sonar-reasoning-pro"
        mode = "Reason"
    else:
        query = args.deep
        model = args.model or "sonar-deep-research"
        mode = "Deep Research"

    print(f"{mode} ({model}): {query}")
    if args.reasoning_effort:
        print(f"  Reasoning effort: {args.reasoning_effort}")
    if model == "sonar-deep-research":
        print("  (This may take a while...)")

    result = chat_query(
        query,
        model=model,
        timeout_seconds=args.timeout,
        reasoning_effort=args.reasoning_effort,
    )

    if result.get("error"):
        print(f"\n❌ Error: {result['error']}")
        sys.exit(1)

    if args.json:
        print(json.dumps(result["raw"], indent=2, ensure_ascii=False))
        return

    print(f"\n✓ {mode} complete (model: {result.get('model', model)})\n")
    if result.get("answer"):
        print(result["answer"])

    citations = result.get("citations") or []
    if citations:
        print("\n📚 Sources:")
        for i, cite in enumerate(citations[:10], 1):
            if isinstance(cite, dict):
                url = cite.get("url") or cite.get("title") or str(cite)
            else:
                url = str(cite)
            print(f"  {i}. {url}")

    usage = result.get("usage") or {}
    if usage.get("total_tokens"):
        print(f"\n📊 Tokens: {usage['total_tokens']}")


if __name__ == "__main__":
    main()
