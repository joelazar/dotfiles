// Source: ben-vargas/pi-packages (https://github.com/ben-vargas/pi-packages)
//   Path: packages/pi-antigravity-image-gen/extensions/index.ts
/**
 * Antigravity Image Generation
 *
 * Generates images via Google Antigravity's Gemini 3 Pro Image model.
 * Returns images as tool result attachments for inline terminal rendering.
 * Requires OAuth login via /login for google-antigravity.
 *
 * Note: Only gemini-3-pro-image is available via the Antigravity API.
 * Imagen models and gemini-2.5-flash-image are NOT supported by this endpoint.
 *
 * Usage:
 *   "Generate an image of a sunset over mountains"
 *   "Create a 16:9 wallpaper of a cyberpunk city"
 *
 * Save modes (tool param, env var, or config file):
 *   save=none     - Don't save to disk (default)
 *   save=project  - Save to <repo>/.pi/generated-images/
 *   save=global   - Save to ~/.pi/agent/generated-images/
 *   save=custom   - Save to saveDir param or PI_IMAGE_SAVE_DIR
 *
 * Environment variables:
 *   PI_IMAGE_SAVE_MODE  - Default save mode (none|project|global|custom)
 *   PI_IMAGE_SAVE_DIR   - Directory for custom save mode
 *
 * Config files (project overrides global):
 *   ~/.pi/agent/extensions/antigravity-image-gen.json
 *   <repo>/.pi/extensions/antigravity-image-gen.json
 *   Example: { "save": "global" }
 *
 * Based on opencode-antigravity-img by ominiverdi (MIT)
 * and opencode-antigravity-auth by NoeFabris (MIT).
 */

import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { StringEnum } from "@mariozechner/pi-ai";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { type Static, Type } from "typebox";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PROVIDER = "google-antigravity";
const IMAGE_MODEL = "gemini-3-pro-image";

const ASPECT_RATIOS = [
  "1:1",
  "2:3",
  "3:2",
  "3:4",
  "4:3",
  "4:5",
  "5:4",
  "9:16",
  "16:9",
  "21:9",
] as const;
type AspectRatio = (typeof ASPECT_RATIOS)[number];

const DEFAULT_ASPECT_RATIO: AspectRatio = "1:1";
const DEFAULT_SAVE_MODE = "none";
const DEFAULT_CONFIG_FILE: ExtensionConfig = { save: "global" };

const SAVE_MODES = ["none", "project", "global", "custom"] as const;
type SaveMode = (typeof SAVE_MODES)[number];

/** Endpoint fallback order — daily first (most permissive), prod last. */
const ANTIGRAVITY_ENDPOINTS = [
  "https://daily-cloudcode-pa.sandbox.googleapis.com",
  "https://autopush-cloudcode-pa.sandbox.googleapis.com",
  "https://cloudcode-pa.googleapis.com",
] as const;

/** Prod endpoint for quota checks. */
const ANTIGRAVITY_ENDPOINT_PROD = "https://cloudcode-pa.googleapis.com";

// Keep Antigravity version in sync with known working UA versions.
// Using an outdated version can yield "This version of Antigravity is no longer supported".
const ANTIGRAVITY_VERSION = "1.15.8";

const ANTIGRAVITY_HEADERS: Record<string, string> = {
  "User-Agent": `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Antigravity/${ANTIGRAVITY_VERSION} Chrome/138.0.7204.235 Electron/37.3.1 Safari/537.36`,
  "X-Goog-Api-Client": "google-cloud-sdk vscode_cloudshelleditor/0.1",
  "Client-Metadata":
    '{"ideType":"IDE_UNSPECIFIED","platform":"PLATFORM_UNSPECIFIED","pluginType":"GEMINI"}',
};

const IMAGE_SYSTEM_INSTRUCTION =
  "You are an AI image generator. Generate images based on user descriptions. Focus on creating high-quality, visually appealing images that match the user's request.";

/** Image generation typically takes 10-30 seconds. */
const IMAGE_GENERATION_TIMEOUT_MS = 60_000;

/** Quota fetch timeout. */
const QUOTA_TIMEOUT_MS = 10_000;

// ---------------------------------------------------------------------------
// Tool parameters
// ---------------------------------------------------------------------------

const TOOL_PARAMS = Type.Object({
  prompt: Type.String({ description: "Image description." }),
  aspectRatio: Type.Optional(StringEnum(ASPECT_RATIOS)),
  save: Type.Optional(StringEnum(SAVE_MODES)),
  saveDir: Type.Optional(
    Type.String({
      description:
        "Directory to save image when save=custom. Defaults to PI_IMAGE_SAVE_DIR if set.",
    }),
  ),
});

type ToolParams = Static<typeof TOOL_PARAMS>;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CloudCodeAssistRequest {
  project: string;
  model: string;
  request: {
    contents: Content[];
    sessionId?: string;
    systemInstruction?: { role?: string; parts: { text: string }[] };
    generationConfig?: {
      responseModalities?: string[];
      imageConfig?: { aspectRatio?: string };
      candidateCount?: number;
    };
    safetySettings?: Array<{ category: string; threshold: string }>;
  };
  requestType?: string;
  userAgent?: string;
  requestId?: string;
}

interface CloudCodeAssistResponseChunk {
  response?: {
    candidates?: Array<{
      content?: {
        role: string;
        parts?: Array<{
          text?: string;
          inlineData?: {
            mimeType?: string;
            data?: string;
          };
        }>;
      };
    }>;
    usageMetadata?: {
      promptTokenCount?: number;
      candidatesTokenCount?: number;
      thoughtsTokenCount?: number;
      totalTokenCount?: number;
      cachedContentTokenCount?: number;
    };
    modelVersion?: string;
    responseId?: string;
  };
  traceId?: string;
}

interface Content {
  role: "user" | "model";
  parts: Part[];
}

interface Part {
  text?: string;
  inlineData?: {
    mimeType?: string;
    data?: string;
  };
}

interface ParsedCredentials {
  accessToken: string;
  projectId: string;
}

interface ExtensionConfig {
  save?: SaveMode;
  saveDir?: string;
}

interface SaveConfig {
  mode: SaveMode;
  outputDir?: string;
}

interface QuotaInfo {
  remainingPercent: number;
  resetIn: string;
  resetTime?: string;
}

interface FetchAvailableModelsResponse {
  models?: Record<
    string,
    {
      quotaInfo?: { remainingFraction?: number; resetTime?: string };
      displayName?: string;
    }
  >;
}

// ---------------------------------------------------------------------------
// Credentials
// ---------------------------------------------------------------------------

function parseOAuthCredentials(raw: string): ParsedCredentials {
  let parsed: { token?: string; projectId?: string };
  try {
    parsed = JSON.parse(raw) as { token?: string; projectId?: string };
  } catch {
    throw new Error(
      "Invalid Google OAuth credentials. Run /login to re-authenticate.",
    );
  }
  if (!parsed.token || !parsed.projectId) {
    throw new Error(
      "Missing token or projectId in Google OAuth credentials. Run /login.",
    );
  }
  return { accessToken: parsed.token, projectId: parsed.projectId };
}

async function getCredentials(ctx: {
  modelRegistry: {
    getApiKeyForProvider: (provider: string) => Promise<string | undefined>;
  };
}): Promise<ParsedCredentials> {
  const apiKey = await ctx.modelRegistry.getApiKeyForProvider(PROVIDER);
  if (!apiKey) {
    throw new Error(
      "Missing Google Antigravity OAuth credentials. Run /login for google-antigravity.",
    );
  }
  return parseOAuthCredentials(apiKey);
}

// ---------------------------------------------------------------------------
// Config / save helpers
// ---------------------------------------------------------------------------

function readConfigFile(path: string): ExtensionConfig {
  if (!existsSync(path)) {
    return {};
  }
  try {
    const content = readFileSync(path, "utf-8");
    const parsed = JSON.parse(content) as ExtensionConfig;
    return parsed ?? {};
  } catch {
    return {};
  }
}

function loadConfig(cwd: string): ExtensionConfig {
  const globalPath = join(
    homedir(),
    ".pi",
    "agent",
    "extensions",
    "antigravity-image-gen.json",
  );
  const projectPath = join(
    cwd,
    ".pi",
    "extensions",
    "antigravity-image-gen.json",
  );
  ensureDefaultConfigFile(projectPath, globalPath);
  const globalConfig = readConfigFile(globalPath);
  const projectConfig = readConfigFile(projectPath);
  return { ...globalConfig, ...projectConfig };
}

function ensureDefaultConfigFile(
  projectConfigPath: string,
  globalConfigPath: string,
): void {
  if (existsSync(projectConfigPath) || existsSync(globalConfigPath)) {
    return;
  }
  try {
    mkdirSync(dirname(globalConfigPath), { recursive: true });
    writeFileSync(
      globalConfigPath,
      `${JSON.stringify(DEFAULT_CONFIG_FILE, null, 2)}\n`,
      "utf-8",
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(
      `[pi-antigravity-image-gen] Failed to write ${globalConfigPath}: ${message}`,
    );
  }
}

function resolveSaveConfig(params: ToolParams, cwd: string): SaveConfig {
  const config = loadConfig(cwd);
  const envMode = (process.env.PI_IMAGE_SAVE_MODE || "").toLowerCase();
  const paramMode = params.save;
  const mode = (paramMode ||
    envMode ||
    config.save ||
    DEFAULT_SAVE_MODE) as SaveMode;

  if (!SAVE_MODES.includes(mode)) {
    return { mode: DEFAULT_SAVE_MODE as SaveMode };
  }

  if (mode === "project") {
    return { mode, outputDir: join(cwd, ".pi", "generated-images") };
  }

  if (mode === "global") {
    return {
      mode,
      outputDir: join(homedir(), ".pi", "agent", "generated-images"),
    };
  }

  if (mode === "custom") {
    const dir =
      params.saveDir || process.env.PI_IMAGE_SAVE_DIR || config.saveDir;
    if (!dir || !dir.trim()) {
      throw new Error("save=custom requires saveDir or PI_IMAGE_SAVE_DIR.");
    }
    return { mode, outputDir: dir };
  }

  return { mode };
}

function imageExtension(mimeType: string): string {
  const lower = mimeType.toLowerCase();
  if (lower.includes("jpeg") || lower.includes("jpg")) return "jpg";
  if (lower.includes("gif")) return "gif";
  if (lower.includes("webp")) return "webp";
  return "png";
}

async function saveImage(
  base64Data: string,
  mimeType: string,
  outputDir: string,
): Promise<string> {
  await mkdir(outputDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const ext = imageExtension(mimeType);
  const filename = `image-${timestamp}-${randomUUID().slice(0, 8)}.${ext}`;
  const filePath = join(outputDir, filename);
  await writeFile(filePath, Buffer.from(base64Data, "base64"));
  return filePath;
}

// ---------------------------------------------------------------------------
// Request building
// ---------------------------------------------------------------------------

function buildRequest(
  prompt: string,
  projectId: string,
  aspectRatio: string,
): CloudCodeAssistRequest {
  return {
    project: projectId,
    model: IMAGE_MODEL,
    request: {
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      systemInstruction: {
        parts: [{ text: IMAGE_SYSTEM_INSTRUCTION }],
      },
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"],
        imageConfig: { aspectRatio },
        candidateCount: 1,
      },
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_ONLY_HIGH",
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_ONLY_HIGH",
        },
        {
          category: "HARM_CATEGORY_CIVIC_INTEGRITY",
          threshold: "BLOCK_ONLY_HIGH",
        },
      ],
    },
    requestType: "agent",
    requestId: `agent-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
    userAgent: "antigravity",
  };
}

// ---------------------------------------------------------------------------
// SSE parsing
// ---------------------------------------------------------------------------

async function parseSseForImage(
  response: Response,
  signal?: AbortSignal,
): Promise<{ image: { data: string; mimeType: string }; text: string[] }> {
  if (!response.body) {
    throw new Error("No response body");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const textParts: string[] = [];

  try {
    while (true) {
      if (signal?.aborted) {
        throw new Error("Request was aborted");
      }

      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const jsonStr = line.slice(5).trim();
        if (!jsonStr || jsonStr === "[DONE]") continue;

        let chunk: CloudCodeAssistResponseChunk;
        try {
          chunk = JSON.parse(jsonStr) as CloudCodeAssistResponseChunk;
        } catch {
          continue;
        }

        const responseData = chunk.response;
        if (!responseData?.candidates) continue;

        for (const candidate of responseData.candidates) {
          const parts = candidate.content?.parts;
          if (!parts) continue;
          for (const part of parts) {
            if (part.text) {
              textParts.push(part.text);
            }
            if (part.inlineData?.data) {
              await reader.cancel();
              return {
                image: {
                  data: part.inlineData.data,
                  mimeType: part.inlineData.mimeType || "image/png",
                },
                text: textParts,
              };
            }
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  if (textParts.length > 0) {
    const summary = textParts.join(" ").replace(/\s+/g, " ").trim();
    const snippet =
      summary.length > 400 ? `${summary.slice(0, 400)}…` : summary;
    throw new Error(
      `No image data returned by the model. Response text: ${snippet}`,
    );
  }

  throw new Error("No image data returned by the model");
}

// ---------------------------------------------------------------------------
// Image generation with endpoint fallback
// ---------------------------------------------------------------------------

async function generateImage(
  accessToken: string,
  projectId: string,
  prompt: string,
  aspectRatio: string,
  signal?: AbortSignal,
): Promise<{ image: { data: string; mimeType: string }; text: string[] }> {
  const requestBody = buildRequest(prompt, projectId, aspectRatio);
  const errors: string[] = [];

  for (const endpoint of ANTIGRAVITY_ENDPOINTS) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        IMAGE_GENERATION_TIMEOUT_MS,
      );

      // Chain with caller's signal
      if (signal) {
        signal.addEventListener("abort", () => controller.abort(), {
          once: true,
        });
      }

      let response: Response;
      try {
        response = await fetch(
          `${endpoint}/v1internal:streamGenerateContent?alt=sse`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
              Accept: "text/event-stream",
              ...ANTIGRAVITY_HEADERS,
            },
            body: JSON.stringify(requestBody),
            signal: controller.signal,
          },
        );
      } finally {
        clearTimeout(timeout);
      }

      if (response.status === 429) {
        // Rate limited — try next endpoint
        errors.push(`${endpoint}: rate limited (429)`);
        continue;
      }

      if (!response.ok) {
        const errorText = await response.text();
        errors.push(
          `${endpoint}: ${response.status} ${errorText.slice(0, 200)}`,
        );
        continue;
      }

      return await parseSseForImage(response, signal);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        if (signal?.aborted) {
          throw new Error("Request was aborted");
        }
        // Timeout — try next endpoint
        errors.push(`${endpoint}: timeout`);
        continue;
      }
      errors.push(
        `${endpoint}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  throw new Error(`All endpoints failed:\n${errors.join("\n")}`);
}

// ---------------------------------------------------------------------------
// Quota check
// ---------------------------------------------------------------------------

async function getImageQuota(
  accessToken: string,
  projectId: string,
): Promise<QuotaInfo | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), QUOTA_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(
        `${ANTIGRAVITY_ENDPOINT_PROD}/v1internal:fetchAvailableModels`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            "User-Agent": ANTIGRAVITY_HEADERS["User-Agent"],
          },
          body: JSON.stringify({ project: projectId }),
          signal: controller.signal,
        },
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) return null;

    const data = (await response.json()) as FetchAvailableModelsResponse;
    if (!data.models) return null;

    // Find the image model entry
    const imageEntry = data.models[IMAGE_MODEL];
    if (!imageEntry?.quotaInfo) return null;

    const quota = imageEntry.quotaInfo;
    const remainingPercent = (quota.remainingFraction ?? 0) * 100;
    const resetTime = quota.resetTime || "";

    let resetIn = "N/A";
    if (resetTime) {
      const resetDate = new Date(resetTime);
      const diffMs = resetDate.getTime() - Date.now();
      if (diffMs > 0) {
        const hours = Math.floor(diffMs / 3600000);
        const mins = Math.floor((diffMs % 3600000) / 60000);
        resetIn = `${hours}h ${mins}m`;
      } else {
        resetIn = "now";
      }
    }

    return { remainingPercent, resetIn, resetTime };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Extension entry point
// ---------------------------------------------------------------------------

export {
  buildRequest,
  parseOAuthCredentials,
  resolveSaveConfig,
  ensureDefaultConfigFile,
  DEFAULT_CONFIG_FILE,
};

export default function antigravityImageGen(pi: ExtensionAPI) {
  // Tool: generate_image
  pi.registerTool({
    name: "generate_image",
    label: "Generate image",
    description:
      "Generate an image via Google Antigravity's Gemini 3 Pro Image model. " +
      "Returns the image as a tool result attachment for inline terminal rendering. " +
      "Optional saving via save=project|global|custom|none, or PI_IMAGE_SAVE_MODE/PI_IMAGE_SAVE_DIR.",
    parameters: TOOL_PARAMS,
    async execute(_toolCallId, params: ToolParams, signal, onUpdate, ctx) {
      const { accessToken, projectId } = await getCredentials(ctx);
      const aspectRatio = params.aspectRatio || DEFAULT_ASPECT_RATIO;

      onUpdate?.({
        content: [
          {
            type: "text",
            text: `Generating image (${IMAGE_MODEL}, ${aspectRatio})...`,
          },
        ],
        details: { provider: PROVIDER, model: IMAGE_MODEL, aspectRatio },
      });

      const parsed = await generateImage(
        accessToken,
        projectId,
        params.prompt,
        aspectRatio,
        signal,
      );

      const saveConfig = resolveSaveConfig(params, ctx.cwd);
      let savedPath: string | undefined;
      let saveError: string | undefined;
      if (saveConfig.mode !== "none" && saveConfig.outputDir) {
        try {
          savedPath = await saveImage(
            parsed.image.data,
            parsed.image.mimeType,
            saveConfig.outputDir,
          );
        } catch (error) {
          saveError = error instanceof Error ? error.message : String(error);
        }
      }

      const summaryParts = [
        `Generated image via ${PROVIDER}/${IMAGE_MODEL}.`,
        `Aspect ratio: ${aspectRatio}.`,
      ];
      if (savedPath) {
        summaryParts.push(`Saved to: ${savedPath}`);
      } else if (saveError) {
        summaryParts.push(`Failed to save: ${saveError}`);
      }
      if (parsed.text.length > 0) {
        summaryParts.push(`Model notes: ${parsed.text.join(" ")}`);
      }

      return {
        content: [
          { type: "text", text: summaryParts.join(" ") },
          {
            type: "image",
            data: parsed.image.data,
            mimeType: parsed.image.mimeType,
          },
        ],
        details: {
          provider: PROVIDER,
          model: IMAGE_MODEL,
          aspectRatio,
          savedPath,
          saveMode: saveConfig.mode,
        },
      };
    },
  });

  // Tool: image_quota
  pi.registerTool({
    name: "image_quota",
    label: "Image quota",
    description:
      "Check remaining image generation quota for the Gemini 3 Pro Image model. " +
      "Shows percentage remaining and time until reset. " +
      "Image generation uses a separate quota from text models. Quota resets every ~5 hours.",
    parameters: Type.Object({}),
    async execute(
      _toolCallId,
      _params: Record<string, never>,
      _signal,
      _onUpdate,
      ctx,
    ) {
      const { accessToken, projectId } = await getCredentials(ctx);
      const quota = await getImageQuota(accessToken, projectId);

      if (!quota) {
        return {
          content: [
            {
              type: "text",
              text: "Could not fetch quota information. The API may be temporarily unavailable.",
            },
          ],
          details: { provider: PROVIDER, model: IMAGE_MODEL, quota: null },
        };
      }

      const barWidth = 20;
      const filled = Math.round((quota.remainingPercent / 100) * barWidth);
      const empty = barWidth - filled;
      const bar = "#".repeat(filled) + ".".repeat(empty);

      const lines = [
        `${IMAGE_MODEL}`,
        `[${bar}] ${quota.remainingPercent.toFixed(0)}% remaining`,
        `Resets in: ${quota.resetIn}`,
      ];

      if (quota.resetTime) {
        const resetDate = new Date(quota.resetTime);
        lines[2] += ` (at ${resetDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})`;
      }

      return {
        content: [{ type: "text", text: lines.join("\n") }],
        details: { provider: PROVIDER, model: IMAGE_MODEL, quota },
      };
    },
  });
}
