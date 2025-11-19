/**
 * JSON filesystem-based storage adapter
 * Directly reads/writes JSON files from the static directory (server-side only)
 */
import type { StorageAdapter } from "../adapter";
import { readFile, writeFile, unlink, readdir, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";

export class JsonFsAdapter implements StorageAdapter {
	private basePath: string;

	constructor(basePath = "static/data") {
		this.basePath = basePath;
	}

	async read<T>(key: string): Promise<T | null> {
		try {
			const filePath = join(this.basePath, key);
			const content = await readFile(filePath, "utf-8");
			return JSON.parse(content) as T;
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === "ENOENT") {
				return null;
			}
			console.warn(`Could not read ${key}:`, error);
			return null;
		}
	}

	async write<T>(key: string, data: T): Promise<void> {
		try {
			const filePath = join(this.basePath, key);
			await mkdir(dirname(filePath), { recursive: true });
			await writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
		} catch (error) {
			console.error(`Failed to write ${key}:`, error);
			throw error;
		}
	}

	async exists(key: string): Promise<boolean> {
		try {
			const filePath = join(this.basePath, key);
			await readFile(filePath);
			return true;
		} catch {
			return false;
		}
	}

	async delete(key: string): Promise<void> {
		try {
			const filePath = join(this.basePath, key);
			await unlink(filePath);
		} catch (error) {
			console.error(`Failed to delete ${key}:`, error);
			throw error;
		}
	}

	async list(prefix = ""): Promise<string[]> {
		try {
			const searchDir = join(this.basePath, prefix);
			const files = await readdir(searchDir, { recursive: true });

			return files
				.filter((file) => typeof file === "string" && file.endsWith(".json"))
				.map((file) =>
					prefix ? join(prefix, file as string) : (file as string),
				);
		} catch (error) {
			console.error("Failed to list keys:", error);
			return [];
		}
	}
}
