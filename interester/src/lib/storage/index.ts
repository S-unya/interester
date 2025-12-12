/**
 * Storage module - unified storage interface
 * Exports all storage operations and configuration
 */

export {
	configureStorage,
	getStorageAdapter,
	type StorageAdapter,
	type StorageConfig,
} from "./adapter";

export { JsonFetchAdapter } from "./adapters/json-fetch";
export { TauriStoreAdapter } from "./adapters/tauri-store";

export { InterestStorage } from "./interests";
export { PreferencesStorage } from "./preferences";
export { ResultStorage } from "./results";

export { initializeStorage, resetStorageInitialization } from "./init";
