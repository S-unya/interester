/**
 * Tauri store-based storage adapter
 * Uses Tauri's plugin-store for persistent key-value storage
 * See: https://tauri.app/plugin/store/
 */

import type { StorageAdapter } from "../adapter";

// biome-ignore lint/suspicious/noExplicitAny: Dynamic import requires any type
type StoreType = any;

export class TauriStoreAdapter implements StorageAdapter {
	private store: StoreType = null;
	private initialized = false;

	constructor(private storeName = "interester.dat") {}

	/**
	 * Lazy initialization of the store
	 */
	private async ensureInitialized(): Promise<void> {
		if (this.initialized) return;

		try {
			// Dynamically import Tauri store plugin
			// Note: This will fail in non-Tauri environments, which is expected
			const { load } = await import("@tauri-apps/plugin-store");
			this.store = await load(this.storeName);
			this.initialized = true;
		} catch (error) {
			throw new Error(
				`Failed to initialize Tauri store: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}

	async read<T>(key: string): Promise<T | null> {
		await this.ensureInitialized();

		try {
			const value = await this.store.get(key);
			return value === undefined || value === null ? null : (value as T);
		} catch (error) {
			console.warn(`Could not read ${key} from Tauri store:`, error);
			return null;
		}
	}

	async write<T>(key: string, data: T): Promise<void> {
		await this.ensureInitialized();

		try {
			await this.store.set(key, data);
			await this.store.save();
		} catch (error) {
			console.error(`Failed to write ${key} to Tauri store:`, error);
			throw error;
		}
	}

	async exists(key: string): Promise<boolean> {
		await this.ensureInitialized();

		try {
			const value = await this.store.has(key);
			return value;
		} catch {
			return false;
		}
	}

	async delete(key: string): Promise<void> {
		await this.ensureInitialized();

		try {
			await this.store.delete(key);
			await this.store.save();
		} catch (error) {
			console.error(`Failed to delete ${key} from Tauri store:`, error);
			throw error;
		}
	}

	async list(prefix?: string): Promise<string[]> {
		await this.ensureInitialized();

		try {
			const keys = await this.store.keys();

			if (!prefix) {
				return keys;
			}

			return keys.filter((key: string) => key.startsWith(prefix));
		} catch (error) {
			console.error("Failed to list keys from Tauri store:", error);
			return [];
		}
	}

	/**
	 * Clear all data from the store
	 */
	async clear(): Promise<void> {
		await this.ensureInitialized();
		await this.store.clear();
		await this.store.save();
	}
}
