// Source: earendil-works/pi-mono (https://github.com/earendil-works/pi-mono)
//   Path: packages/coding-agent/examples/extensions/custom-provider-anthropic/index.ts
/**
 * Extra Anthropic OAuth Provider
 *
 * Registers a second Anthropic provider under its own ID so a second
 * Claude Pro/Max OAuth session can live alongside the built-in `anthropic`
 * slot in ~/.pi/agent/auth.json.
 *
 * Implementation note:
 *   The official example reimplements the entire Anthropic streamer
 *   (and pulls in @anthropic-ai/sdk). We don't need that — pi's built-in
 *   `anthropic-messages` API already auto-detects OAuth tokens
 *   (`sk-ant-oat...`) and applies the Claude Code stealth headers,
 *   system prompt and tool-name remapping. So this extension only
 *   contributes the OAuth dance and a fresh provider id; pi handles
 *   the rest. No npm deps required.
 */

import type { OAuthCredentials, OAuthLoginCallbacks } from "@earendil-works/pi-ai";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

// =============================================================================
// OAuth (mirrors packages/ai/src/utils/oauth/anthropic.ts)
// =============================================================================

const decode = (s: string) => atob(s);
const CLIENT_ID = decode("OWQxYzI1MGEtZTYxYi00NGQ5LTg4ZWQtNTk0NGQxOTYyZjVl");
const AUTHORIZE_URL = "https://claude.ai/oauth/authorize";
const TOKEN_URL = "https://console.anthropic.com/v1/oauth/token";
const REDIRECT_URI = "https://console.anthropic.com/oauth/code/callback";
const SCOPES = "org:create_api_key user:profile user:inference";

async function generatePKCE(): Promise<{ verifier: string; challenge: string }> {
	const array = new Uint8Array(32);
	crypto.getRandomValues(array);
	const verifier = btoa(String.fromCharCode(...array))
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");

	const data = new TextEncoder().encode(verifier);
	const hash = await crypto.subtle.digest("SHA-256", data);
	const challenge = btoa(String.fromCharCode(...new Uint8Array(hash)))
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");

	return { verifier, challenge };
}

async function loginAnthropic(callbacks: OAuthLoginCallbacks): Promise<OAuthCredentials> {
	const { verifier, challenge } = await generatePKCE();

	const authParams = new URLSearchParams({
		code: "true",
		client_id: CLIENT_ID,
		response_type: "code",
		redirect_uri: REDIRECT_URI,
		scope: SCOPES,
		code_challenge: challenge,
		code_challenge_method: "S256",
		state: verifier,
	});

	callbacks.onAuth({ url: `${AUTHORIZE_URL}?${authParams.toString()}` });

	const authCode = await callbacks.onPrompt({ message: "Paste the authorization code:" });
	const [code, state] = authCode.split("#");

	const tokenResponse = await fetch(TOKEN_URL, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			grant_type: "authorization_code",
			client_id: CLIENT_ID,
			code,
			state,
			redirect_uri: REDIRECT_URI,
			code_verifier: verifier,
		}),
	});

	if (!tokenResponse.ok) {
		throw new Error(`Token exchange failed: ${await tokenResponse.text()}`);
	}

	const data = (await tokenResponse.json()) as {
		access_token: string;
		refresh_token: string;
		expires_in: number;
	};

	return {
		refresh: data.refresh_token,
		access: data.access_token,
		expires: Date.now() + data.expires_in * 1000 - 5 * 60 * 1000,
	};
}

async function refreshAnthropicToken(credentials: OAuthCredentials): Promise<OAuthCredentials> {
	const response = await fetch(TOKEN_URL, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			grant_type: "refresh_token",
			client_id: CLIENT_ID,
			refresh_token: credentials.refresh,
		}),
	});

	if (!response.ok) {
		throw new Error(`Token refresh failed: ${await response.text()}`);
	}

	const data = (await response.json()) as {
		access_token: string;
		refresh_token: string;
		expires_in: number;
	};

	return {
		refresh: data.refresh_token,
		access: data.access_token,
		expires: Date.now() + data.expires_in * 1000 - 5 * 60 * 1000,
	};
}

// =============================================================================
// Extension entry point
// =============================================================================

export default function (pi: ExtensionAPI) {
	pi.registerProvider("anthropic-extra", {
		baseUrl: "https://api.anthropic.com",
		apiKey: "ANTHROPIC_EXTRA_API_KEY",
		api: "anthropic-messages",

		// Mirrors built-in pi-ai anthropic models (see pi-ai/dist/models.generated.js).
		models: [
			{
				id: "claude-opus-4-7",
				name: "Claude Opus 4.7 (Extra)",
				reasoning: true,
				thinkingLevelMap: { xhigh: "xhigh" },
				input: ["text", "image"],
				cost: { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 },
				contextWindow: 1_000_000,
				maxTokens: 128_000,
			},
			{
				id: "claude-sonnet-4-6",
				name: "Claude Sonnet 4.6 (Extra)",
				reasoning: true,
				input: ["text", "image"],
				cost: { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
				contextWindow: 1_000_000,
				maxTokens: 64_000,
			},
		],

		oauth: {
			name: "Anthropic (Claude Pro/Max - Extra)",
			login: loginAnthropic,
			refreshToken: refreshAnthropicToken,
			getApiKey: (cred) => cred.access,
		},
	});
}
