/**
 * Storage write API endpoint
 * Used by JsonFetchAdapter to write data to the file system
 */

import { json, type RequestHandler } from "@sveltejs/kit";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export const POST: RequestHandler = async ({
	request,
}: {
	request: Request;
}) => {
	try {
		const { key, data } = await request.json();

		if (!key) {
			return json(
				{ success: false, error: "Key is required" },
				{ status: 400 },
			);
		}

		// Write to static/data directory
		const dataDir = "static/data";
		const filePath = join(dataDir, key);

		// Ensure directory exists
		await mkdir(dirname(filePath), { recursive: true });

		// Write file
		await writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");

		return json({ success: true });
	} catch (error) {
		console.error("Failed to write file:", error);
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
};
