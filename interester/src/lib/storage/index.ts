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

export { JsonFetchAdapter, JsonFsAdapter, TauriStoreAdapter } from "./adapters";

export { InterestStorage } from "./interests";
export { PreferencesStorage } from "./preferences";
export { ResultStorage } from "./results";

export { initializeStorage, resetStorageInitialization } from "./init";
