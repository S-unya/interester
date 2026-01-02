import { json } from "@sveltejs/kit";
import { InterestStorage, ResultStorage } from "$lib/storage";
import type { RequestHandler } from "./$types";
import type { FormattedResult } from "$lib/types";

export const GET: RequestHandler = async () => {
    try {
        const interestIds = await ResultStorage.listAll();
        const allResults: FormattedResult[] = [];

        await Promise.all(
            interestIds.map(async (id) => {
                const results = await ResultStorage.getByInterestId(id);
                allResults.push(...results);
            }),
        );

        // Sort by generatedAt descending and take the top 15
        const sortedResults = allResults
            .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))
            .slice(0, 15);

        return json({
            success: true,
            data: sortedResults,
        });
    } catch (error) {
        console.error("Failed to fetch activity:", error);
        return json({
            success: false,
            error: "Failed to fetch activity stream",
        });
    }
};
