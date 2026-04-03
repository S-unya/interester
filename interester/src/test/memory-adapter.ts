/**
 * In-memory StorageAdapter for use in tests.
 * Provides a clean, isolated store per test.
 */
import type { StorageAdapter } from "$lib/storage/adapter";

export function createMemoryAdapter(): StorageAdapter {
	const store = new Map<string, unknown>();

	return {
		async read<T>(key: string): Promise<T | null> {
			return (store.get(key) as T) ?? null;
		},
		async write<T>(key: string, data: T): Promise<void> {
			store.set(key, data);
		},
		async exists(key: string): Promise<boolean> {
			return store.has(key);
		},
		async delete(key: string): Promise<void> {
			store.delete(key);
		},
		async list(prefix?: string): Promise<string[]> {
			const keys = Array.from(store.keys());
			return prefix ? keys.filter((k) => k.startsWith(prefix)) : keys;
		},
	};
}
