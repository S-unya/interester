/**
 * Storage read API endpoint
 * Used by JsonFetchAdapter to read data from the file system
 */

import { json, type RequestHandler } from "@sveltejs/kit";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const GET: RequestHandler = async ({ url }: { url: URL }) => {
    try {
        const key = url.searchParams.get("key");

        if (!key) {
            return json(
                { success: false, error: "Key is required" },
                { status: 400 },
            );
        }

        // Read from data directory
        const dataDir = "data";
        const filePath = join(dataDir, key);

        try {
            const content = await readFile(filePath, "utf-8");
            return json(JSON.parse(content));
        } catch (e) {
            // If file not found, return null as expected by adapter
            return json(null);
        }
    } catch (error) {
        console.error("Failed to read file:", error);
        return json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 },
        );
    }
};
