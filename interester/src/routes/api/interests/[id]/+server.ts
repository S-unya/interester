import { json } from "@sveltejs/kit";
import type { RequestHandler } from "@sveltejs/kit";
import { InterestStorage, initializeStorage } from "$lib/storage";
import type { Interest, InterestUpdateInput, ApiResponse } from "$lib/types";

// GET /api/interests/[id] - Get a single interest
export const GET: RequestHandler = async ({ params }) => {
	try {
		if (!params.id) {
			return json(
				{
					success: false,
					error: "Interest ID is required",
				} satisfies ApiResponse<Interest>,
				{ status: 400 },
			);
		}

		await initializeStorage();
		const interest = await InterestStorage.getById(params.id);

		if (!interest) {
			return json(
				{
					success: false,
					error: "Interest not found",
				} satisfies ApiResponse<Interest>,
				{ status: 404 },
			);
		}

		return json({
			success: true,
			data: interest,
		} satisfies ApiResponse<Interest>);
	} catch (error) {
		console.error("Failed to fetch interest:", error);
		return json(
			{
				success: false,
				error: "Failed to fetch interest",
			} satisfies ApiResponse<Interest>,
			{ status: 500 },
		);
	}
};

// PUT /api/interests/[id] - Update an interest
export const PUT: RequestHandler = async ({ params, request }) => {
	try {
		await initializeStorage();
		const body: InterestUpdateInput = await request.json();

		const updatedInterest = await InterestStorage.update(params.id, body);

		if (!updatedInterest) {
			return json(
				{
					success: false,
					error: "Interest not found",
				} satisfies ApiResponse<Interest>,
				{ status: 404 },
			);
		}

		return json({
			success: true,
			data: updatedInterest,
		} satisfies ApiResponse<Interest>);
	} catch (error) {
		console.error("Failed to update interest:", error);
		return json(
			{
				success: false,
				error: "Failed to update interest",
			} satisfies ApiResponse<Interest>,
			{ status: 500 },
		);
	}
};

// DELETE /api/interests/[id] - Delete an interest
export const DELETE: RequestHandler = async ({ params }) => {
	try {
		await initializeStorage();
		if (!params.id) {
			return json(
				{
					success: false,
					error: "Interest ID is required",
				} satisfies ApiResponse<null>,
				{ status: 400 },
			);
		}

		const deleted = await InterestStorage.delete(params.id);

		if (!deleted) {
			return json(
				{
					success: false,
					error: "Interest not found",
				} satisfies ApiResponse<null>,
				{ status: 404 },
			);
		}

		return json({
			success: true,
		} satisfies ApiResponse<null>);
	} catch (error) {
		console.error("Failed to delete interest:", error);
		return json(
			{
				success: false,
				error: "Failed to delete interest",
			} satisfies ApiResponse<null>,
			{ status: 500 },
		);
	}
};
