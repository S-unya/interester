/**
 * Storage initialization
 * Detects the environment and configures the appropriate storage adapter
 */

import {
	JsonFetchAdapter,
	JsonFsAdapter,
	TauriStoreAdapter,
	configureStorage,
} from "./index";

let initialized = false;

/**
 * Check if running in Tauri
 */
function isTauriEnvironment(): boolean {
	return (
		typeof window !== "undefined" &&
		"__TAURI__" in window &&
		window.__TAURI__ !== undefined
	);
}

/**
 * Check if running in browser context
 */
function isBrowser(): boolean {
	return typeof window !== "undefined";
}

/**
 * Initialize storage with the appropriate adapter for the current environment
 */
export async function initializeStorage(): Promise<void> {
	if (initialized) {
		return;
	}

	try {
		if (isTauriEnvironment()) {
			console.log("Initializing Tauri store adapter...");
			const adapter = new TauriStoreAdapter();
			configureStorage(adapter);
		} else if (isBrowser()) {
			console.log("Initializing JSON fetch adapter (browser)...");
			const adapter = new JsonFetchAdapter();
			configureStorage(adapter);
		} else {
			console.log("Initializing JSON filesystem adapter (server)...");
			const adapter = new JsonFsAdapter();
			configureStorage(adapter);
		}

		initialized = true;
		console.log("Storage initialized successfully");
	} catch (error) {
		console.error("Failed to initialize storage:", error);
		throw error;
	}
}

/**
 * Reset initialization state (useful for testing)
 */
export function resetStorageInitialization(): void {
	initialized = false;
}
