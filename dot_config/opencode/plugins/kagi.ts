// Kagi through the local `kagi` CLI (subscriber session, ~/.kagi.toml), ported from pi's web-tools.
// - registers a "kagi" websearch provider and makes it the default for the built-in `websearch` tool
// - adds a `kagi_summarize` tool (subscriber Universal Summarizer)
import { execFile } from "node:child_process"
import { existsSync } from "node:fs"
import { homedir } from "node:os"

const KAGI = process.env.KAGI_BIN ?? (existsSync("/opt/homebrew/bin/kagi") ? "/opt/homebrew/bin/kagi" : "kagi")
const SEARCH_LIMIT = 10
const MAX_OUTPUT = 4 * 1024 * 1024
const SUMMARY_TYPES = ["summary", "keypoints", "eli5"] as const

type Json = Record<string, unknown>

function runKagi(args: string[], signal: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    // cwd = $HOME so kagi-cli finds ~/.kagi.toml; no shell involved.
    execFile(KAGI, args, { cwd: homedir(), signal, maxBuffer: MAX_OUTPUT, timeout: 120_000 }, (error, stdout, stderr) => {
      if (error) reject(new Error(`kagi ${args[0]} failed: ${errorMessage(stderr) ?? error.message}`))
      else resolve(stdout)
    })
  })
}

// `--error-format json` prints {"message": ...} as the last JSON line on stderr.
function errorMessage(stderr: string): string | undefined {
  const lines = stderr.split("\n").map((l) => l.trim()).filter(Boolean).reverse()
  for (const line of lines) {
    if (!line.startsWith("{")) continue
    try {
      const parsed = JSON.parse(line) as Json
      if (typeof parsed.message === "string") return parsed.message
    } catch {}
  }
  return lines[0]
}

const isObject = (v: unknown): v is Json => typeof v === "object" && v !== null && !Array.isArray(v)

function parseSearch(stdout: string) {
  const payload = JSON.parse(stdout) as unknown
  const items = Array.isArray(payload) ? payload : isObject(payload) && Array.isArray(payload.data) ? payload.data : []
  return items.flatMap((item: unknown) => {
    // t=0 is a web result; t=1 is a related-searches block without a URL.
    if (!isObject(item) || (typeof item.t === "number" && item.t !== 0) || typeof item.url !== "string") return []
    const snippet =
      typeof item.snippet === "string" ? item.snippet.replace(/\s+/g, " ").replace(/\s*Summarize\s*$/, "").trim() : ""
    const published = typeof item.published === "string" ? Date.parse(item.published) : NaN
    return [
      {
        url: item.url,
        ...(typeof item.title === "string" && item.title.trim() ? { title: item.title.trim() } : {}),
        ...(snippet ? { content: snippet } : {}),
        time: Number.isFinite(published) ? { published } : {},
      },
    ]
  })
}

// The subscriber summarizer returns small, simple HTML (p/ul/li/strong); convert just enough for the model.
function htmlToText(html: string): string {
  return html
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<\/(p|li|h\d)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?(strong|b)>/gi, "**")
    .replace(/<\/?(em|i)>/gi, "_")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n\s*\n(?=- )/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

function parseSummary(stdout: string): string {
  const payload = JSON.parse(stdout) as unknown
  const data = isObject(payload) ? payload.data : undefined
  if (isObject(data)) {
    // Both fields can hold HTML depending on the engine; htmlToText is a no-op on plain markdown.
    for (const field of [data.markdown, data.output]) {
      if (typeof field === "string" && field.trim()) return htmlToText(field)
    }
  }
  throw new Error("kagi summarize returned an empty summary")
}

export default {
  id: "joe.kagi",
  async setup(ctx: any) {
    await ctx.websearch.transform((editor: any) => {
      editor.add({
        id: "kagi",
        name: "Kagi",
        execute: async ({ query }: { query: string }, { signal }: { signal: AbortSignal }) =>
          parseSearch(
            await runKagi(
              ["search", "--format", "json", "--error-format", "json", "--no-color", "--limit", String(SEARCH_LIMIT), "--", query],
              signal,
            ),
          ),
      })
      editor.default.set("kagi")
    })

    await ctx.tool.transform((editor: any) => {
      editor.add({
        name: "kagi_summarize",
        description:
          "Summarize a public web page, PDF, or YouTube video with Kagi's Universal Summarizer. " +
          "Use it instead of webfetch when you only need the gist of a long page.",
        input: {
          type: "object",
          properties: {
            url: { type: "string", description: "Public http(s) URL to summarize" },
            type: {
              type: "string",
              enum: SUMMARY_TYPES,
              description: "summary (prose, default), keypoints (bullets), or eli5",
            },
          },
          required: ["url"],
          additionalProperties: false,
        },
        execute: async (input: { url: string; type?: string }, context: { signal: AbortSignal }) => {
          const url = new URL(input.url)
          if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Only http(s) URLs are supported")
          const type = input.type ?? "summary"
          const stdout = await runKagi(
            ["summarize", "--subscriber", "--error-format", "json", "--summary-type", type, "--url", url.href],
            context.signal,
          )
          return { content: parseSummary(stdout) }
        },
      })
    })
  },
}
