/**
 * JSON fetch-based storage adapter
 * Uses fetch API to read JSON files from the static directory
 * Useful for development and web-based deployments
 */
import { json } from "@sveltejs/kit";
import type { StorageAdapter } from "../adapter";

export class JsonFetchAdapter implements StorageAdapter {
	private basePath: string;
	private cache: Map<string, unknown> = new Map();

	constructor(basePath = "/data") {
		this.basePath = basePath;
	}

	async read<T>(key: string): Promise<T | null> {
		try {
			// Check cache first
			if (this.cache.has(key)) {
				return this.cache.get(key) as T;
			}

			const url = `${this.basePath}/${key}`;
			const response = await fetch(url);

			if (!response.ok) {
				if (response.status === 404) {
					return null;
				}
				throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
			}

			const data = await response.json();
			this.cache.set(key, data);
			return data as T;
		} catch (error) {
			console.warn(`Could not read ${key}:`, error);
			return null;
		}
	}

	async write<T>(key: string, data: T): Promise<void> {
		// For fetch-based adapter, we need to use an API endpoint
		// This will POST to /api/storage/write
		try {
			const response = await fetch("/api/storage/write", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ key, data }),
			});

			if (!response.ok) {
				throw new Error(`Failed to write ${key}: ${response.statusText}`);
			}

			// Update cache
			this.cache.set(key, data);
		} catch (error) {
			console.error(`Failed to write ${key}:`, error);
			throw error;
		}
	}

	async exists(key: string): Promise<boolean> {
		try {
			const url = `${this.basePath}/${key}`;
			const response = await fetch(url, { method: "HEAD" });
			return response.ok;
		} catch {
			return false;
		}
	}

	async delete(key: string): Promise<void> {
		try {
			const response = await fetch("/api/storage/delete", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ key }),
			});

			if (!response.ok) {
				throw new Error(`Failed to delete ${key}: ${response.statusText}`);
			}

			// Remove from cache
			this.cache.delete(key);
		} catch (error) {
			console.error(`Failed to delete ${key}:`, error);
			throw error;
		}
	}

	async list(prefix?: string): Promise<string[]> {
		try {
			const response = await fetch(
				`/api/storage/list${prefix ? `?prefix=${encodeURIComponent(prefix)}` : ""}`,
			);

			if (!response.ok) {
				throw new Error(`Failed to list keys: ${response.statusText}`);
			}

			const result = await response.json();
			return result.keys || [];
		} catch (error) {
			console.error("Failed to list keys:", error);
			return [];
		}
	}

	/**
	 * Clear the internal cache
	 */
	clearCache(): void {
		this.cache.clear();
	}
}
