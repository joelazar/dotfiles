#!/usr/bin/env node

import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";

const args = process.argv.slice(2);

const contentIndex = args.indexOf("--content");
const fetchContent = contentIndex !== -1;
if (fetchContent) args.splice(contentIndex, 1);

let numResults = 10;
const nIndex = args.indexOf("-n");
if (nIndex !== -1 && args[nIndex + 1]) {
	numResults = parseInt(args[nIndex + 1], 10);
	args.splice(nIndex, 2);
}

const query = args.join(" ");

if (!query) {
	console.log("Usage: search.js <query> [-n <num>] [--content]");
	console.log("\nOptions:");
	console.log("  -n <num>              Number of results (default: 10, max: 100)");
	console.log("  --content             Fetch readable content as markdown");
	console.log("\nEnvironment:");
	console.log("  KAGI_API_KEY          Required. Your Kagi Search API key.");
	console.log("\nExamples:");
	console.log('  search.js "javascript async await"');
	console.log('  search.js "rust programming" -n 20');
	console.log('  search.js "climate change" --content');
	process.exit(1);
}

const apiKey = process.env.KAGI_API_KEY;
if (!apiKey) {
	console.error("Error: KAGI_API_KEY environment variable is required.");
	console.error("Get your API key at: https://kagi.com/settings/api");
	process.exit(1);
}

async function fetchKagiResults(query, numResults) {
	const params = new URLSearchParams({
		q: query,
		limit: Math.min(numResults, 100).toString(),
	});

	const url = `https://kagi.com/api/v0/search?${params.toString()}`;

	const response = await fetch(url, {
		headers: {
			"Authorization": `Bot ${apiKey}`,
		}
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`HTTP ${response.status}: ${response.statusText}\n${errorText}`);
	}

	const data = await response.json();

	const results = [];
	const relatedSearches = [];

	// Extract results from data array
	if (data.data && Array.isArray(data.data)) {
		for (const item of data.data) {
			if (item.t === 0) {
				// Search result (type 0)
				results.push({
					title: item.title || "",
					link: item.url || "",
					snippet: item.snippet || "",
					published: item.published || "",
				});
			} else if (item.t === 1 && item.list) {
				// Related searches (type 1)
				relatedSearches.push(...item.list);
			}
		}
	}

	// Log API balance if available
	if (data.meta && data.meta.api_balance !== undefined) {
		console.error(`[API Balance: $${data.meta.api_balance.toFixed(2)}]`);
	}

	return { results, relatedSearches };
}

function htmlToMarkdown(html) {
	const turndown = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced" });
	turndown.use(gfm);
	turndown.addRule("removeEmptyLinks", {
		filter: (node) => node.nodeName === "A" && !node.textContent?.trim(),
		replacement: () => "",
	});
	return turndown
		.turndown(html)
		.replace(/\[\\?\[\s*\\?\]\]\([^)]*\)/g, "")
		.replace(/ +/g, " ")
		.replace(/\s+,/g, ",")
		.replace(/\s+\./g, ".")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

async function fetchPageContent(url) {
	try {
		const response = await fetch(url, {
			headers: {
				"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
				"Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
			},
			signal: AbortSignal.timeout(10000),
		});

		if (!response.ok) {
			return `(HTTP ${response.status})`;
		}

		const html = await response.text();
		const dom = new JSDOM(html, { url });
		const reader = new Readability(dom.window.document);
		const article = reader.parse();

		if (article && article.content) {
			return htmlToMarkdown(article.content).substring(0, 5000);
		}

		// Fallback: try to get main content
		const fallbackDoc = new JSDOM(html, { url });
		const body = fallbackDoc.window.document;
		body.querySelectorAll("script, style, noscript, nav, header, footer, aside").forEach(el => el.remove());
		const main = body.querySelector("main, article, [role='main'], .content, #content") || body.body;
		const text = main?.textContent || "";

		if (text.trim().length > 100) {
			return text.trim().substring(0, 5000);
		}

		return "(Could not extract content)";
	} catch (e) {
		return `(Error: ${e.message})`;
	}
}

// Main
try {
	const { results, relatedSearches } = await fetchKagiResults(query, numResults);

	if (results.length === 0) {
		console.error("No results found.");
		process.exit(0);
	}

	if (fetchContent) {
		for (const result of results) {
			result.content = await fetchPageContent(result.link);
		}
	}

	for (let i = 0; i < results.length; i++) {
		const r = results[i];
		console.log(`--- Result ${i + 1} ---`);
		console.log(`Title: ${r.title}`);
		console.log(`Link: ${r.link}`);
		if (r.published) {
			console.log(`Published: ${r.published}`);
		}
		console.log(`Snippet: ${r.snippet}`);
		if (r.content) {
			console.log(`Content:\n${r.content}`);
		}
		console.log("");
	}

	if (relatedSearches.length > 0) {
		console.log("--- Related Searches ---");
		for (const term of relatedSearches) {
			console.log(`- ${term}`);
		}
	}
} catch (e) {
	console.error(`Error: ${e.message}`);
	process.exit(1);
}
