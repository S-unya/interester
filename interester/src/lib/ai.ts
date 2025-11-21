import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";

// TODO: eventually we want to allow users to select models and supply their own API keys.
// Read API keys from environment variables.
// These are expected to be defined in the `.env` file in the `interester` directory.
const GEMINI_KEY = process.env.GEMINI_KEY;
const SERPER_KEY = process.env.SERPER_KEY;

if (!GEMINI_KEY) {
	console.warn(
		"[ai] GEMINI_KEY is not set. Gemini-based features will fail until it is configured.",
	);
}

if (!SERPER_KEY) {
	console.warn(
		"[ai] SERPER_KEY is not set. Serper search features will fail until it is configured.",
	);
}

// Configure the Google Generative AI provider (Gemini) for use with the Vercel AI SDK.
// This module is intended to be used from server-side code only (e.g. +server.ts routes).
export const gemini = createGoogleGenerativeAI({
	apiKey: GEMINI_KEY,
});

// Default model to use for summarisation / general reasoning.
// You can change this to a different Gemini model if desired.
export const geminiModel = gemini("gemini-2.0-flash");

export async function generateGeminiText(options: {
	prompt: string;
	system?: string;
	abortSignal?: AbortSignal;
}): Promise<string> {
	const { prompt, system, abortSignal } = options;

	const result = await generateText({
		model: geminiModel,
		prompt,
		system,
		abortSignal,
	});

	return result.text;
}

// --- Serper search helper ----------------------------------------------------

const SERPER_ENDPOINT = "https://google.serper.dev/search";

export interface SerperOrganicResult {
	title: string;
	link: string;
	snippet?: string;
	date?: string;
	[key: string]: unknown;
}

export interface SerperSearchResponse {
	organic?: SerperOrganicResult[];
	[key: string]: unknown;
}

export interface SerperSearchOptions {
	num?: number;
	gl?: string;
	hl?: string;
}

/**
 * Perform a web search using the Serper API.
 *
 * This helper is also intended for server-side usage only. Do not call it
 * directly from client components, as it relies on the secret SERPER_KEY.
 */
export async function serperSearch(
	query: string,
	options: SerperSearchOptions = {},
): Promise<SerperSearchResponse> {
	if (!SERPER_KEY) {
		throw new Error("SERPER_KEY environment variable is not set.");
	}

	const response = await fetch(SERPER_ENDPOINT, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"X-API-KEY": SERPER_KEY,
		},
		body: JSON.stringify({
			q: query,
			num: options.num ?? 10,
			gl: options.gl ?? "us",
			hl: options.hl ?? "en",
		}),
	});

	if (!response.ok) {
		const bodyText = await response.text().catch(() => "");
		throw new Error(
			`Serper search failed with status ${response.status}: ${bodyText}`,
		);
	}

	const json = (await response.json()) as SerperSearchResponse;
	return json;
}
