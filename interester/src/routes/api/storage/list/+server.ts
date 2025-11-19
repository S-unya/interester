/**
 * Storage list API endpoint
 * Used by JsonFetchAdapter to list files in the file system
 */

import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { json, type RequestHandler } from "@sveltejs/kit";

export const GET: RequestHandler = async ({ url }: { url: URL }) => {
	try {
		const prefix = url.searchParams.get("prefix") || "";

		// List files in static/data directory
		const dataDir = "static/data";
		const searchDir = join(dataDir, prefix);

		const files: string[] = await readdir(searchDir, { recursive: true });

		// Filter to only JSON files and construct full keys
		const keys = files
			.filter((file) => typeof file === "string" && file.endsWith(".json"))
			.map((file) =>
				prefix ? join(prefix, file as string) : (file as string),
			);

		return json({ success: true, keys });
	} catch (error) {
		console.error("Failed to list files:", error);
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
				keys: [],
			},
			{ status: 500 },
		);
	}
};
