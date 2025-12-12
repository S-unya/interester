import { InterestStorage, initializeStorage } from "$lib/storage";
import { ResultStorage } from "$lib/storage/results";
import { generateGeminiText, serperSearch, type SerperOrganicResult } from "$lib/ai";
import type { FormattedResult, Interest } from "$lib/types";
import { generateId } from "$lib/utils";

export const Scanner = {
    /**
     * Run a full scan for a given interest:
     * 1. Analyze intent & generate queries (LLM)
     * 2. Search (Serper)
     * 3. Summarize & Format (LLM)
     * 4. Save results
     */
    async runInterestScan(interestId: string): Promise<FormattedResult> {
        await initializeStorage();
        const interest = await InterestStorage.getById(interestId);

        if (!interest) {
            throw new Error(`Interest with ID ${interestId} not found`);
        }

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

        // 4. Save
        // We need to fetch existing results to append/update, or just overwrite?
        // type definitions say getByInterestId returns FormattedResult[], so likely a list of reports.
        const existing = await ResultStorage.getByInterestId(interestId);
        const newResultsList = [formatted, ...existing]; // Prepend new result
        await ResultStorage.save(interestId, newResultsList);

        return formatted;
    },

    async generateQueries(interest: Interest): Promise<string[]> {
        const prompt = `
You are an expert search query generator.
Your goal is to generate 3-5 highly effective Google search queries to monitor the following user interest.

Interest Name: ${interest.name}
Description: ${interest.description || "N/A"}
Keywords: ${interest.searchTerms.join(", ")}
Specific URLs: ${interest.monitorUrls?.join(", ") ?? "N/A"}

Think about the user's likely intent. Convert broad topics into specific, news-oriented, or discovery-oriented queries.
Return ONLY a JSON array of strings. No markdown formatting.
Example: ["query 1", "query 2"]
`;

        try {
            const text = await generateGeminiText({
                prompt,
                system: "You are a helpful assistant that outputs raw JSON."
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

        const prompt = `
You are an intelligent content curator.
The user is interested in: "${interest.name}" (${interest.description}).

Here are the latest search results found for this interest:
${resultsContext}

Tasks:
1. filtering: Ignore results that are irrelevant, spammy, or duplicates.
2. synthesis: Summarize the key findings into a cohesive daily briefing. Please translate the content into English.
3. formatting: Produce a clean HTML report. Use <h3> for headlines, <p> for text, <ul>/<li> for lists. Include <a href="..."> links to the sources. Where the results are events, create a microformat vCard for each event.

Output Format: JSON object with the following structure:
{
  "summary": "One sentence high-level summary",
  "formattedHtml": "The full HTML report...",
  "formattedText": "Plain text version of the report...",
  "keyPoints": ["point 1", "point 2"],
  "sources": [{ "title": "...", "url": "..." }]
}
Return ONLY raw JSON.
`;

        try {
            const text = await generateGeminiText({
                prompt,
                system: "You are a content curator that outputs structured JSON."
            });
            const cleanText = text.replace(/```json|```/g, "").trim();
            const data = JSON.parse(cleanText);

            return {
                id: generateId(),
                interestId: interest.id,
                searchId: generateId(), // We don't have a separate search obj yet
                formattedHtml: data.formattedHtml,
                formattedText: data.formattedText,
                summary: data.summary,
                keyPoints: data.keyPoints || [],
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
