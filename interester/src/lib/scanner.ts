import {
	generateGeminiText,
	type SerperOrganicResult,
	serperSearch,
} from "$lib/ai";
import prompts from "$lib/prompts.json";
import type { FormattedResult, Interest } from "$lib/types";
import { generateId } from "$lib/utils";

export const Scanner = {
	/**
	 * Perform the actual AI scan logic without storage side effects.
	 * Useful for stateless API routes.
	 */
	async performScan(interest: Interest): Promise<FormattedResult> {
		// 1. Generate Queries
		const queries = await this.generateQueries(interest);
		console.log(`[Scanner] Generated queries for "${interest.name}":`, queries);

		// 2. Perform Searches — 10 results per query; apply recency filter for news/discussions
		const rawResults: SerperOrganicResult[] = [];
		const useDateFilter =
			interest.contentType === "news" || interest.contentType === "discussions";

		for (const query of queries) {
			try {
				const response = await serperSearch(query, {
					num: 10,
					...(useDateFilter ? { tbs: "qdr:w" } : {}),
				});
				if (response.organic) {
					rawResults.push(...response.organic);
				}
			} catch (err) {
				console.error(`[Scanner] Search failed for query "${query}":`, err);
			}
		}

		// Deduplicate results by link
		const uniqueResults = Array.from(
			new Map(rawResults.map((item) => [item.link, item])).values(),
		);
		console.log(`[Scanner] Found ${uniqueResults.length} unique results.`);

		// 3. Summarize & Format
		const formatted = await this.generateSummary(interest, uniqueResults);

		return formatted;
	},

	async generateQueries(interest: Interest): Promise<string[]> {
		const prompt = prompts.queryGenerator.prompt
			.replace("{name}", interest.name)
			.replace("{description}", interest.description || "N/A")
			.replace("{keywords}", interest.searchTerms.join(", "))
			.replace("{urls}", interest.monitorUrls?.join(", ") ?? "N/A")
			.replace("{contentType}", interest.contentType || "general")
			.replace("{date}", new Date().toISOString());

		try {
			const text = await generateGeminiText({
				prompt,
				system: prompts.queryGenerator.system,
			});
			// Clean up potentially excessive markdown
			const cleanText = text.replace(/```json|```/g, "").trim();
			return JSON.parse(cleanText);
		} catch (e) {
			console.error(
				"[Scanner] Failed to generate queries via LLM, falling back to keywords.",
				e,
			);
			return interest.searchTerms;
		}
	},

	async generateSummary(
		interest: Interest,
		results: SerperOrganicResult[],
	): Promise<FormattedResult> {
		const resultsContext = results
			.map(
				(r, i) => `
[Result ${i + 1}]
Title: ${r.title}
Link: ${r.link}
Snippet: ${r.snippet ?? ""}
Date: ${r.date ?? "Unknown"}
Image: ${(r.imageUrl as string | undefined) ?? ""}
`,
			)
			.join("\n");

		const prompt = prompts.summaryCurator.prompt
			.replace("{name}", interest.name)
			.replace("{description}", interest.description || "")
			.replace("{results}", resultsContext);

		try {
			const text = await generateGeminiText({
				prompt,
				system: prompts.summaryCurator.system,
			});
			const cleanText = text.replace(/```json|```/g, "").trim();
			const data = JSON.parse(cleanText);

			return {
				id: generateId(),
				interestId: interest.id,
				searchId: generateId(),
				summary: data.summary,
				keyPoints: data.keyPoints || [],
				items: data.items || [],
				sources: data.sources || [],
				generatedAt: new Date().toISOString(),
				status: "unread" as const,
			};
		} catch (e) {
			console.error("[Scanner] Failed to generate summary", e);
			throw e;
		}
	},
};
