import { json } from "@sveltejs/kit";
import type { RequestHandler } from "@sveltejs/kit";
import { Scanner } from "$lib/scanner";
import type { ApiResponse, FormattedResult } from "$lib/types";

// POST /api/interests/[id]/run - Trigger a manual scan for an interest
export const POST: RequestHandler = async ({ params }) => {
	try {
		if (!params.id) {
			return json(
				{
					success: false,
					error: "Interest ID is required",
				} satisfies ApiResponse<FormattedResult>,
				{ status: 400 },
			);
		}

		console.log(`[API] Triggering scan for interest ${params.id}`);
		const result = await Scanner.runInterestScan(params.id);

		return json({
			success: true,
			data: result,
		} satisfies ApiResponse<FormattedResult>);
	} catch (error) {
		console.error("Failed to run interest scan:", error);
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Failed to run scan",
			} satisfies ApiResponse<FormattedResult>,
			{ status: 500 },
		);
	}
};
