import { InterestStorage, initializeStorage } from "$lib/storage";
import { ResultStorage } from "$lib/storage/results";
import { generateGeminiText, serperSearch, type SerperOrganicResult } from "$lib/ai";
import type { FormattedResult, Interest } from "$lib/types";
import { generateId } from "$lib/utils";
import prompts from "$lib/prompts.json";

export const Scanner = {
    /**
     * Run a full scan for a given interest (Legacy method that handles storage):
     * 1. Load interest from storage
     * 2. Perform scan
     * 3. Save results to storage
     */
    async runInterestScan(interestId: string): Promise<FormattedResult> {
        await initializeStorage();
        const interest = await InterestStorage.getById(interestId);

        if (!interest) {
            throw new Error(`Interest with ID ${interestId} not found`);
        }

        const formatted = await this.performScan(interest);

        // 4. Save (Server-side storage)
        const existing = await ResultStorage.getByInterestId(interestId);
        const newResultsList = [formatted, ...existing];
        await ResultStorage.save(interestId, newResultsList);

        return formatted;
    },

    /**
     * Perform the actual AI scan logic without storage side effects.
     * Useful for stateless API routes.
     */
    async performScan(interest: Interest): Promise<FormattedResult> {
        // 1. Generate Queries
        const queries = await this.generateQueries(interest);
        console.log(`[Scanner] Generated queries for "${interest.name}":`, queries);

        // 2. Perform Searches
        const rawResults: SerperOrganicResult[] = [];
        for (const query of queries) {
            try {
                const response = await serperSearch(query, { num: 5 });
                if (response.organic) {
                    rawResults.push(...response.organic);
                }
            } catch (err) {
                console.error(`[Scanner] Search failed for query "${query}":`, err);
            }
        }

        // Deduplicate results by link
        const uniqueResults = Array.from(new Map(rawResults.map(item => [item.link, item])).values());
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
            .replace("{date}", new Date().toISOString());

        try {
            const text = await generateGeminiText({
                prompt,
                system: prompts.queryGenerator.system
            });
            // Clean up potentially excessive markdown
            const cleanText = text.replace(/```json|```/g, "").trim();
            return JSON.parse(cleanText);
        } catch (e) {
            console.error("[Scanner] Failed to generate queries via LLM, falling back to keywords.", e);
            return interest.searchTerms;
        }
    },

    async generateSummary(interest: Interest, results: SerperOrganicResult[]): Promise<FormattedResult> {
        const resultsContext = results.map((r, i) => `
[Result ${i + 1}]
Title: ${r.title}
Link: ${r.link}
Snippet: ${r.snippet}
Date: ${r.date || "Unknown"}
`).join("\n");

        const prompt = prompts.summaryCurator.prompt
            .replace("{name}", interest.name)
            .replace("{description}", interest.description || "")
            .replace("{results}", resultsContext);

        try {
            const text = await generateGeminiText({
                prompt,
                system: prompts.summaryCurator.system
            });
            const cleanText = text.replace(/```json|```/g, "").trim();
            const data = JSON.parse(cleanText);

            return {
                id: generateId(),
                interestId: interest.id,
                searchId: generateId(),
                formattedHtml: data.formattedHtml,
                formattedText: data.formattedText || "", // We can derive this if missing or leave empty
                summary: data.summary,
                keyPoints: data.keyPoints || [],
                items: data.items || [],
                sources: data.sources || [],
                generatedAt: new Date().toISOString()
            };

        } catch (e) {
            console.error("[Scanner] Failed to generate summary", e);
            // Fallback
            return {
                id: generateId(),
                interestId: interest.id,
                searchId: generateId(),
                formattedHtml: "<p>Failed to generate AI summary. Please try again.</p>",
                formattedText: "Failed to generate AI summary.",
                summary: "Error during generation.",
                keyPoints: [],
                sources: [],
                generatedAt: new Date().toISOString()
            };
        }
    }
};
