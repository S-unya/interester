/**
 * Storage adapter interface
 * Abstracts the underlying storage mechanism (JSON files, Tauri persisted scope, etc.)
 */

export interface StorageAdapter {
	/**
	 * Read data from storage
	 * @param key - The storage key/path
	 * @returns The parsed data or null if not found
	 */
	read<T>(key: string): Promise<T | null>;

	/**
	 * Write data to storage
	 * @param key - The storage key/path
	 * @param data - The data to write
	 */
	write<T>(key: string, data: T): Promise<void>;

	/**
	 * Check if a key exists in storage
	 * @param key - The storage key/path
	 */
	exists(key: string): Promise<boolean>;

	/**
	 * Delete data from storage
	 * @param key - The storage key/path
	 */
	delete(key: string): Promise<void>;

	/**
	 * List all keys with a given prefix
	 * @param prefix - The prefix to filter by
	 */
	list(prefix?: string): Promise<string[]>;
}

/**
 * Storage configuration
 */
export interface StorageConfig {
	adapter: StorageAdapter;
}

let currentAdapter: StorageAdapter | null = null;

/**
 * Configure the storage system with a specific adapter
 */
export function configureStorage(adapter: StorageAdapter): void {
	currentAdapter = adapter;
}

/**
 * Get the currently configured storage adapter
 */
export function getStorageAdapter(): StorageAdapter {
	if (!currentAdapter) {
		throw new Error(
			"Storage adapter not configured. Call configureStorage() first.",
		);
	}
	return currentAdapter;
}
