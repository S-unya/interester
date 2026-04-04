/**
 * SecretStorage — secure key/value storage via the OS native keychain.
 *
 * All reads and writes of sensitive secrets (API keys) go through this module.
 * No other module should call the `get_secret`, `set_secret`, or `delete_secret`
 * Tauri commands directly.
 *
 * Backed by macOS Keychain, iOS Keychain, and Android Keystore via the Rust
 * `keyring` crate exposed as Tauri commands.
 *
 * An in-memory session cache is maintained so the OS keychain is only hit once
 * per key per session. The cache is invalidated on every write or delete, and
 * can be cleared explicitly via `clearCache()` (used in tests).
 */

import { invoke } from "@tauri-apps/api/core";

const cache = new Map<string, string | null>();

export const SecretStorage = {
	/**
	 * Retrieve a secret from the OS keychain.
	 * Returns the cached value if available; otherwise fetches from the keychain
	 * and caches the result.
	 * Returns null if the key has not been stored.
	 */
	async getSecret(key: string): Promise<string | null> {
		if (cache.has(key)) {
			return cache.get(key) ?? null;
		}
		const value = await invoke<string | null>("get_secret", { key });
		cache.set(key, value);
		return value;
	},

	/**
	 * Store a secret in the OS keychain.
	 * Overwrites any existing value for the same key and invalidates the cache.
	 */
	async setSecret(key: string, value: string): Promise<void> {
		cache.delete(key);
		return invoke("set_secret", { key, value });
	},

	/**
	 * Remove a secret from the OS keychain.
	 * Succeeds silently if the key does not exist. Invalidates the cache.
	 */
	async deleteSecret(key: string): Promise<void> {
		cache.delete(key);
		return invoke("delete_secret", { key });
	},

	/**
	 * Clear the entire in-memory cache.
	 * Intended for use in tests and for forcing a fresh read after external changes.
	 */
	clearCache(): void {
		cache.clear();
	},
};
