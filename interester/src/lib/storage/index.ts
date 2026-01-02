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
export { initializeStorage, resetStorageInitialization } from "./init";
export { InterestStorage } from "./interests";
export { PreferencesStorage } from "./preferences";
export { ResultNotesStorage } from "./result-notes";
export { ResultStorage } from "./results";
