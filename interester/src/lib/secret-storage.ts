/**
 * SecretStorage — secure key/value storage via the OS native keychain.
 *
 * All reads and writes of sensitive secrets (API keys) go through this module.
 * No other module should call the `get_secret`, `set_secret`, or `delete_secret`
 * Tauri commands directly.
 *
 * Backed by macOS Keychain, iOS Keychain, and Android Keystore via the Rust
 * `keyring` crate exposed as Tauri commands.
 */

import { invoke } from "@tauri-apps/api/core";

export const SecretStorage = {
	/**
	 * Retrieve a secret from the OS keychain.
	 * Returns null if the key has not been stored.
	 */
	async getSecret(key: string): Promise<string | null> {
		return invoke<string | null>("get_secret", { key });
	},

	/**
	 * Store a secret in the OS keychain.
	 * Overwrites any existing value for the same key.
	 */
	async setSecret(key: string, value: string): Promise<void> {
		return invoke("set_secret", { key, value });
	},

	/**
	 * Remove a secret from the OS keychain.
	 * Succeeds silently if the key does not exist.
	 */
	async deleteSecret(key: string): Promise<void> {
		return invoke("delete_secret", { key });
	},
};
