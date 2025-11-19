/**
 * Storage delete API endpoint
 * Used by JsonFetchAdapter to delete data from the file system
 */

import type { RequestHandler } from "@sveltejs/kit";
import { json } from "@sveltejs/kit";
import { unlink } from "node:fs/promises";
import { join } from "node:path";

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { key } = await request.json();

		if (!key) {
			return json(
				{ success: false, error: "Key is required" },
				{ status: 400 },
			);
		}

		// Delete from static/data directory
		const dataDir = "static/data";
		const filePath = join(dataDir, key);

		await unlink(filePath);

		return json({ success: true });
	} catch (error) {
		console.error("Failed to delete file:", error);
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
};
