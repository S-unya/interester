import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText, type LanguageModel } from "ai";
import { PreferencesStorage } from "./storage/preferences";

// --- Provider Factory --------------------------------------------------------

async function getAiModel(): Promise<LanguageModel> {
	const prefs = await PreferencesStorage.get();
	const provider = prefs.aiProvider || "google";
	const apiKey = prefs.aiApiKey;
	const modelName =
		prefs.aiModel || (provider === "google" ? "gemini-2.0-flash" : "gpt-4o");

	if (provider === "google") {
		const google = createGoogleGenerativeAI({
			apiKey: apiKey || undefined,
		});
		return google(modelName);
	}

	if (provider === "openai") {
		const openai = createOpenAI({
			apiKey: apiKey || undefined,
			baseURL: prefs.aiBaseUrl,
		});
		return openai(modelName);
	}

	if (provider === "anthropic") {
		const anthropic = createAnthropic({
			apiKey: apiKey || undefined,
		});
		return anthropic(modelName);
	}

	if (provider === "bedrock") {
		const bedrock = createAmazonBedrock({
			region: "us-east-1", // Default region, could be configurable
			accessKeyId: process.env.AWS_ACCESS_KEY_ID, // Use env for now as keys are complex
			secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
		});
		return bedrock(modelName);
	}

	// For Local/Ollama, we can often use createOpenAI with a base URL
	if (provider === "local" || provider === "ollama") {
		const local = createOpenAI({
			apiKey: apiKey || "not-needed",
			baseURL: prefs.aiBaseUrl || "http://localhost:11434/v1",
		});
		return local(modelName);
	}

	// Default fallback
	const google = createGoogleGenerativeAI({
		apiKey: apiKey || undefined,
	});
	return google("gemini-1.5-flash");
}

export async function generateGeminiText(options: {
	prompt: string;
	system?: string;
	abortSignal?: AbortSignal;
}): Promise<string> {
	const { prompt, system, abortSignal } = options;

	console.log("[ai] Generating text with prompt:", prompt);

	const model = await getAiModel();

	const result = await generateText({
		model,
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
	tbs?: string;
}

/**
 * Perform a web search using the Serper API.
 */
export async function serperSearch(
	query: string,
	options: SerperSearchOptions = {},
): Promise<SerperSearchResponse> {
	const prefs = await PreferencesStorage.get();
	const serperKey = prefs.serperApiKey;

	if (!serperKey) {
		console.warn("[ai] serperApiKey is not set in preferences.");
		// Fallback to Env if available for backward compatibility during transition
		// but ideally we want to force setup soon.
	}

	console.log("[ai] Performing Serper search with query:", query);

	try {
		const response = await fetch(SERPER_ENDPOINT, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-API-KEY": serperKey || "",
			},
			body: JSON.stringify({
				q: query,
				num: options.num ?? 10,
				gl: options.gl ?? "us",
				hl: options.hl ?? "en",
				...(options.tbs ? { tbs: options.tbs } : {}),
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
	} catch (error) {
		console.error("[ai] Serper search failed:", error);
		return {};
	}
}
