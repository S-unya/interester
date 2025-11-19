import { InterestStorage, initializeStorage } from "$lib/storage";
import type { ApiResponse, Interest, InterestCreateInput } from "$lib/types";
import type { RequestHandler } from "@sveltejs/kit";
import { json } from "@sveltejs/kit";

// GET /api/interests - List all interests
export const GET: RequestHandler = async () => {
	try {
		await initializeStorage();
		const interests = await InterestStorage.getAll();
		return json({
			success: true,
			data: interests,
		} satisfies ApiResponse<Interest[]>);
	} catch (error) {
		console.error("Failed to fetch interests:", error);
		return json(
			{
				success: false,
				error: "Failed to fetch interests",
			} satisfies ApiResponse<Interest[]>,
			{ status: 500 },
		);
	}
};

// POST /api/interests - Create a new interest
export const POST: RequestHandler = async ({ request }) => {
	try {
		await initializeStorage();
		const body: InterestCreateInput = await request.json();

		// Validation
		if (!body.name || !body.searchTerms || body.searchTerms.length === 0) {
			return json(
				{
					success: false,
					error: "Name and at least one search term are required",
				} satisfies ApiResponse<Interest>,
				{ status: 400 },
			);
		}

		const newInterest = await InterestStorage.create({
			name: body.name,
			description: body.description,
			searchTerms: body.searchTerms,
			monitorUrls: body.monitorUrls || [],
			contentTypes: body.contentTypes || ["general"],
			active: true,
		});

		return json(
			{
				success: true,
				data: newInterest,
			} satisfies ApiResponse<Interest>,
			{ status: 201 },
		);
	} catch (error) {
		console.error("Failed to create interest:", error);
		return json(
			{
				success: false,
				error: "Failed to create interest",
			} satisfies ApiResponse<Interest>,
			{ status: 500 },
		);
	}
};
