import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { InterestStorage } from "$lib/storage";
import type { Interest, InterestUpdateInput, ApiResponse } from "$lib/types";

// GET /api/interests/[id] - Get a single interest
export const GET: RequestHandler = async ({ params }) => {
	try {
		const interest = await InterestStorage.getById(params.id);

		if (!interest) {
			return json<ApiResponse<Interest>>(
				{
					success: false,
					error: "Interest not found",
				},
				{ status: 404 },
			);
		}

		return json<ApiResponse<Interest>>({
			success: true,
			data: interest,
		});
	} catch (error) {
		console.error("Failed to fetch interest:", error);
		return json<ApiResponse<Interest>>(
			{
				success: false,
				error: "Failed to fetch interest",
			},
			{ status: 500 },
		);
	}
};

// PUT /api/interests/[id] - Update an interest
export const PUT: RequestHandler = async ({ params, request }) => {
	try {
		const body: InterestUpdateInput = await request.json();

		const updatedInterest = await InterestStorage.update(params.id, body);

		if (!updatedInterest) {
			return json<ApiResponse<Interest>>(
				{
					success: false,
					error: "Interest not found",
				},
				{ status: 404 },
			);
		}

		return json<ApiResponse<Interest>>({
			success: true,
			data: updatedInterest,
		});
	} catch (error) {
		console.error("Failed to update interest:", error);
		return json<ApiResponse<Interest>>(
			{
				success: false,
				error: "Failed to update interest",
			},
			{ status: 500 },
		);
	}
};

// DELETE /api/interests/[id] - Delete an interest
export const DELETE: RequestHandler = async ({ params }) => {
	try {
		const deleted = await InterestStorage.delete(params.id);

		if (!deleted) {
			return json<ApiResponse<null>>(
				{
					success: false,
					error: "Interest not found",
				},
				{ status: 404 },
			);
		}

		return json<ApiResponse<null>>({
			success: true,
		});
	} catch (error) {
		console.error("Failed to delete interest:", error);
		return json<ApiResponse<null>>(
			{
				success: false,
				error: "Failed to delete interest",
			},
			{ status: 500 },
		);
	}
};
